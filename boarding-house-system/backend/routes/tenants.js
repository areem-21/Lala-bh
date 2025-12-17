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
    throw new Error('Email credentials not configured');
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } catch (err) {
    console.error('Failed to create email transporter', err);
    throw err;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log('Email sent:', info && info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
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
router.get("/all", verifyAdmin, async (req, res) => {
  try {
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

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // ✅ Await instead of callback
    const [rows] = await db.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("TENANTS LIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});



/* ============================================
   ADMIN — GET PENDING TENANTS
============================================ */
router.get("/pending", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.id, t.full_name, t.email, t.phone, t.status,
             r.room_number, r.type
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.id
      WHERE t.status = 'pending'
    `);
    res.json(rows);
  } catch (err) {
    console.error("Pending tenants error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ============================================
   ADMIN — SEND NOTIFICATION EMAIL
   POST /tenants/notify-email
   body: { to, subject, message }
============================================ */
router.post('/notify-email', verifyAdmin, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, message: 'to, subject and message are required' });
    }

    await sendEmail(to, subject, message);
    return res.json({ success: true, message: 'Notification sent' });
  } catch (err) {
    console.error('NOTIFY EMAIL ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});


/* ============================================
   ADMIN — APPROVE TENANT + ASSIGN ROOM
============================================ */

router.patch("/approve/:id", verifyAdmin, async (req, res) => {
  try {
    const tenantId = req.params.id;

    // Find tenant
    const [tenantRows] = await db.query("SELECT * FROM tenants WHERE id = ? LIMIT 1", [tenantId]);
    if (!tenantRows.length) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    const tenant = tenantRows[0];

    // Tenant must have a room
    if (!tenant.room_id) {
      return res.status(400).json({ success: false, message: "Tenant has no assigned room" });
    }

    // Find room
    const [roomRows] = await db.query("SELECT * FROM rooms WHERE id = ? LIMIT 1", [tenant.room_id]);
    if (!roomRows.length) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    const room = roomRows[0];

    // ✅ Compute occupancy dynamically (only approved tenants count)
    const [occupancyRows] = await db.query(
      "SELECT COUNT(*) AS occupancy FROM tenants WHERE room_id = ? AND status = 'approved'",
      [tenant.room_id]
    );
    const currentOccupancy = occupancyRows[0].occupancy;

    if (currentOccupancy >= room.capacity) {
      const [availableRooms] = await db.query(
        "SELECT id, room_number, type, capacity FROM rooms WHERE id NOT IN (SELECT room_id FROM tenants WHERE status = 'approved')"
      );
      return res.status(400).json({
        success: false,
        message: "Room is already full. Please assign another room.",
        availableRooms,
      });
    }

    // ✅ Approve tenant + initialize balance to room rate
    await db.query(
      "UPDATE tenants SET status = 'approved', balance = ? WHERE id = ?",
      [room.rate, tenantId]
    );

    // ✅ Update room occupancy values
    const newOccupancy = currentOccupancy + 1;
    const availableSlots = room.capacity - newOccupancy;
    const newStatus = availableSlots <= 0 ? "occupied" : "available";

    await db.query(
      "UPDATE rooms SET current_occupancy = ?, available_slots = ?, status = ? WHERE id = ?",
      [newOccupancy, availableSlots, newStatus, room.id]
    );

    return res.json({
      success: true,
      message: "Tenant approved successfully",
      tenantId,
      room: {
        room_number: room.room_number,
        type: room.type,
        capacity: room.capacity,
        current_occupancy: newOccupancy,
        available_slots: availableSlots,
        status: newStatus,
      },
    });
  } catch (err) {
    console.error("APPROVE TENANT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error approving tenant" });
  }
});



/* ============================================
   TENANT — REQUEST ROOM (fix duplicate email)
============================================ */
// backend/routes/tenants.js
// backend/routes/tenants.js
router.post("/request-room", verifyTenant, async (req, res) => {
  try {
    const { full_name, email, phone, gender, address, emergency_contact, room_id } = req.body;
    const user_id = req.user.id; // ✅ defined by verifyTenant

    // Get room rate
    const [roomRows] = await db.query("SELECT rate FROM rooms WHERE id = ? LIMIT 1", [room_id]);
    const roomRate = roomRows.length ? Number(roomRows[0].rate || 0) : 0;

    // Check if tenant already exists
    const [rows] = await db.query("SELECT id FROM tenants WHERE user_id = ? LIMIT 1", [user_id]);

    if (rows.length > 0) {
      const tenantId = rows[0].id;

      await db.query(
        `UPDATE tenants SET 
          full_name=?, email=?, phone=?, gender=?, address=?, emergency_contact=?, 
          room_id=?, status='pending', balance=?
         WHERE id = ?`,
        [full_name, email, phone, gender, address, emergency_contact, room_id, roomRate, tenantId]
      );

      return res.json({ success: true, message: "Room request updated", tenantId });
    } else {
      const [result] = await db.query(
        `INSERT INTO tenants (
          full_name, email, phone, gender, address, emergency_contact,
          created_at, user_id, room_id, status, balance
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'pending', ?)`,
        [full_name, email, phone, gender, address, emergency_contact, user_id, room_id, roomRate]
      );

      return res.json({ success: true, message: "Room request submitted", tenantId: result.insertId });
    }
  } catch (err) {
    console.error("REQUEST ROOM ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/* ============================================
   TENANT — /my-request
============================================ */
router.get("/my-request", verifyTenant, async (req, res) => {
  try {
    const sql = `
      SELECT t.*, r.room_number, r.type, r.rate
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [req.user.id]);

    if (!rows.length) {
      return res.json({ message: "No request found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("MY REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
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

// backend/routes/payments.js (or tenants.js)
router.get("/summary", verifyTenant, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        t.id AS tenant_id,
        t.balance,
        r.rate AS room_rate,
        r.room_number
      FROM tenants t
      LEFT JOIN rooms r ON r.id = t.room_id
      WHERE t.user_id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [userId]);

    if (!rows.length) {
      return res.json({
        success: false,
        message: "Tenant not found",
      });
    }

    const tenant = rows[0];

    return res.json({
      success: true,
      tenant: {
        room_number: tenant.room_number || null,
        room_rate: Number(tenant.room_rate || 0),
        balance: Number(tenant.balance || tenant.room_rate || 0), // ✅ use balance
      },
    });
  } catch (err) {
    console.error("TENANT SUMMARY ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
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
