// backend/routes/tenants.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/* ============================================
   EMAIL SENDER
============================================ */
const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email disabled: missing .env credentials");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};

/* ============================================
   MIDDLEWARE
============================================ */
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const verifyTenant = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "client" && decoded.role !== "tenant")
      return res.status(403).json({ message: "Forbidden" });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ============================================
   ADMIN — GET ALL TENANTS
============================================ */
router.get("/all", verifyAdmin, (req, res) => {
  let query = `
    SELECT t.id, t.full_name, t.email, t.phone, t.gender, t.address, 
           t.emergency_contact, r.room_number, r.type, r.rate, 
           t.status, t.created_at
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
  `;

  const params = [];
  const conditions = [];

  if (req.query.month) {
    conditions.push("MONTH(t.created_at) = ?");
    params.push(parseInt(req.query.month));
  }

  if (req.query.search) {
    const search = `%${req.query.search}%`;
    conditions.push("(t.full_name LIKE ? OR t.email LIKE ? OR t.phone LIKE ?)");
    params.push(search, search, search);
  }

  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(rows);
  });
});

/* ============================================
   ADMIN — GET PENDING TENANTS
============================================ */
router.get("/pending", verifyAdmin, (req, res) => {
  const sql = `
    SELECT t.id, t.full_name, t.email, t.phone, t.gender, 
           r.room_number, r.type, r.rate,
           t.status, t.created_at
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.status = 'pending'
    ORDER BY t.created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(rows);
  });
});

/* ============================================
   ADMIN — APPROVE TENANT + ASSIGN ROOM
============================================ */
router.patch("/approve/:id", verifyAdmin, (req, res) => {
  const tenantId = req.params.id;

  const sqlTenant = "SELECT * FROM tenants WHERE id = ? LIMIT 1";
  db.query(sqlTenant, [tenantId], (err, tenantRows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!tenantRows.length) return res.status(404).json({ message: "Tenant not found" });

    const tenant = tenantRows[0];

    // Requested room
    const sqlRoom = "SELECT * FROM rooms WHERE id = ? LIMIT 1";
    db.query(sqlRoom, [tenant.room_id], (err2, roomRows) => {
      if (err2) return res.status(500).json({ message: "Server error" });
      if (!roomRows.length) return res.status(404).json({ message: "Room not found" });

      const room = roomRows[0];

      if (room.available_slots <= 0)
        return res.status(400).json({ message: "Room is full" });

      // Gender check
      const sqlGenders = `
        SELECT gender FROM tenants 
        WHERE room_id = ? AND status = 'approved'
      `;

      db.query(sqlGenders, [room.id], (err3, occ) => {
        if (err3) return res.status(500).json({ message: "Server error" });

        const existingGenders = occ.map(o => o.gender);
        const g = tenant.gender.toLowerCase();

        const hasMale = existingGenders.includes("male");
        const hasFemale = existingGenders.includes("female");

        let incompatible = false;
        if (g === "male" && hasFemale) incompatible = true;
        if (g === "female" && hasMale) incompatible = true;

        if (incompatible)
          return res.status(400).json({
            message: "Gender conflict in selected room"
          });

        // Approve tenant
        const sqlApprove = `
          UPDATE tenants 
          SET status = 'approved' 
          WHERE id = ?
        `;
        db.query(sqlApprove, [tenantId], (err4) => {
          if (err4) return res.status(500).json({ message: "Server error" });

          // Update room capacity
          const sqlUpdateRoom = `
            UPDATE rooms 
            SET current_occupancy = current_occupancy + 1,
                available_slots = available_slots - 1,
                status = CASE WHEN available_slots - 1 <= 0 THEN 'occupied' ELSE 'available' END
            WHERE id = ?
          `;
          db.query(sqlUpdateRoom, [room.id], () => {
            return res.json({
              message: "Tenant approved successfully",
              room
            });
          });
        });
      });
    });
  });
});

/* ============================================
   TENANT — REQUEST ROOM (fix duplicate email)
============================================ */
router.post("/request-room", verifyTenant, (req, res) => {
  const { full_name, email, phone, gender, address, emergency_contact, room_id } = req.body;
  const user_id = req.user.id;

  const sqlCheck = "SELECT id FROM tenants WHERE user_id = ? LIMIT 1";

  db.query(sqlCheck, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (rows.length > 0) {
      const tenantId = rows[0].id;

      const sqlUpdate = `
        UPDATE tenants SET 
          full_name=?, email=?, phone=?, gender=?, address=?, emergency_contact=?, 
          room_id=?, status='pending'
        WHERE id = ?
      `;

      db.query(sqlUpdate,
        [full_name, email, phone, gender, address, emergency_contact, room_id, tenantId],
        (e2) => {
          if (e2) return res.status(500).json({ message: "Update failed" });
          return res.json({ message: "Room request updated", tenantId });
        }
      );
    } else {
      const sqlInsert = `
        INSERT INTO tenants (
          full_name, email, phone, gender, address, emergency_contact,
          created_at, user_id, room_id, status
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'pending')
      `;

      db.query(sqlInsert,
        [full_name, email, phone, gender, address, emergency_contact, user_id, room_id],
        (e3, r) => {
          if (e3) return res.status(500).json({ message: "Insert failed" });
          return res.json({ message: "Room request submitted", tenantId: r.insertId });
        }
      );
    }
  });
});

/* ============================================
   TENANT — /my-request
============================================ */
router.get("/my-request", verifyTenant, (req, res) => {
  const sql = `
    SELECT t.*, r.room_number, r.type, r.rate
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 1
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (!rows.length) return res.json({ message: "No request found" });

    res.json(rows[0]);
  });
});

/* ============================================
   TENANT — DASHBOARD
============================================ */
router.get("/dashboard", verifyTenant, (req, res) => {
  const user_id = req.user.id;

  const sql = `
    SELECT 
      t.id,
      t.full_name AS tenant_name,
      t.status,
      r.room_number,
      r.type,
      r.rate
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.user_id = ?
    LIMIT 1
  `;

  db.query(sql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Internal server error" });

    if (rows.length === 0) {
      return res.json({
        tenant: {
          tenant_name: "Unknown Tenant",
          room_number: null,
          type: null,
          rate: null,
          status: "No Request"
        }
      });
    }

    return res.json({ tenant: rows[0] });
  });
});

/* ============================================
   ADMIN — UPCOMING DUES
============================================ */
router.get("/upcoming-dues", verifyAdmin, (req, res) => {
  const sql = `
    SELECT t.id, t.full_name, t.email, t.phone, 
           r.room_number, r.type, t.created_at
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.status='approved'
      AND DATE_ADD(t.created_at, INTERVAL 30 DAY) >= CURDATE()
    ORDER BY t.created_at ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(rows);
  });
});

module.exports = router;
