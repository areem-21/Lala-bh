const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware to check admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") 
      return res.status(403).json({ message: "Forbidden" });

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ------------------------------------------------------
// 🔹 ADD ROOM  (matches your frontend: /rooms/add)
// ------------------------------------------------------
router.post("/add", verifyAdmin, (req, res) => {
  const { room_number, type, rate, capacity } = req.body;

  if (!room_number || !type || !rate || !capacity) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = `
      INSERT INTO rooms (room_number, type, rate, capacity)
      VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [room_number, type, rate, capacity], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    return res.json({ message: "Room added", roomId: result.insertId });
  });
});

// ------------------------------------------------------
// 🔹 ASSIGN TENANT TO ROOM (matches UI: /rooms/assign)
// ------------------------------------------------------
// 🔹 ASSIGN TENANT TO ROOM (matches UI: /rooms/assign)
router.post("/assign", verifyAdmin, async (req, res) => {
  try {
    const { tenant_id, room_id } = req.body;

    if (!tenant_id || !room_id) {
      return res.status(400).json({ message: "Tenant ID and Room ID required" });
    }

    // 1. Check if room exists & get capacity + occupancy
    const [roomRows] = await db.query(
      `SELECT id, capacity, current_occupancy, available_slots, status
       FROM rooms
       WHERE id = ?`,
      [room_id]
    );

    if (!roomRows.length) {
      return res.status(404).json({ message: "Room not found" });
    }

    const room = roomRows[0];

    if (room.current_occupancy >= room.capacity) {
      return res.status(400).json({ message: "Room is already full" });
    }

    // 2. Assign tenant to this room
    await db.query(`UPDATE tenants SET room_id = ?, status = 'approved' WHERE id = ?`, [
      room_id,
      tenant_id,
    ]);

    // 3. Update room occupancy
    await db.query(
      `UPDATE rooms 
       SET current_occupancy = current_occupancy + 1,
           available_slots = capacity - current_occupancy - 1,
           status = CASE WHEN capacity - current_occupancy - 1 <= 0 THEN 'occupied' ELSE 'available' END
       WHERE id = ?`,
      [room_id]
    );

    return res.json({ message: "Tenant assigned successfully", room_id, tenant_id });
  } catch (err) {
    console.error("ASSIGN ROOM ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ------------------------------------------------------
// 🔹 GET ROOMS + OCCUPANCY
// ------------------------------------------------------
router.get("/list", async (req, res) => {
  const sql = `
    SELECT 
      r.id,
      r.room_number,
      r.type,
      r.rate,
      r.capacity,
      (SELECT COUNT(*) FROM tenants WHERE room_id = r.id AND status != 'rejected') AS occupied_count,
      CASE 
        WHEN (SELECT COUNT(*) FROM tenants WHERE room_id = r.id AND status != 'rejected') >= r.capacity 
        THEN 'Full'
        ELSE 'Available'
      END AS availability
    FROM rooms r
    ORDER BY r.room_number ASC
  `;
  try {
    const [rows] = await db.query(sql);
    return res.json(rows);
  } catch (err) {
    console.error("Rooms list DB error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;
