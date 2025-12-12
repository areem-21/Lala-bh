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
router.post("/assign", verifyAdmin, (req, res) => {
  const { tenant_id, room_id } = req.body;

  if (!tenant_id || !room_id) {
    return res.status(400).json({ message: "Tenant ID and Room ID required" });
  }

  // Check if room exists & get capacity
  const checkRoom = `
      SELECT capacity,
             (SELECT COUNT(*) FROM tenants WHERE room_id = ?) AS occupied
      FROM rooms
      WHERE id = ?
  `;

  db.query(checkRoom, [room_id, room_id], (err, roomRows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!roomRows.length) return res.status(404).json({ message: "Room not found" });

    const { capacity, occupied } = roomRows[0];

    if (occupied >= capacity) {
      return res.status(400).json({ message: "Room is already full" });
    }

    // Assign tenant to this room
    const sql = `UPDATE tenants SET room_id = ? WHERE id = ?`;

    db.query(sql, [room_id, tenant_id], (err2, result2) => {
      if (err2) return res.status(500).json({ message: err2.message });

      return res.json({ message: "Tenant assigned successfully" });
    });
  });
});

// ------------------------------------------------------
// 🔹 GET ROOMS + OCCUPANCY
// ------------------------------------------------------
router.get("/list", (req, res) => {
  const sql = `
    SELECT 
      r.id,
      r.room_number,
      r.type,
      r.rate,
      r.capacity,
      r.status,
      (SELECT COUNT(*) FROM tenants WHERE room_id = r.id) AS occupied_count
    FROM rooms r
    ORDER BY r.room_number ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Internal server error" });

    res.json(rows);
  });
});

module.exports = router;
