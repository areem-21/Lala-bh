const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Admin stats route
router.get("/stats", async (req, res) => {
  try {
    // 🔑 Check token directly here
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // ✅ Use async/await for queries
    const [[rooms]]    = await db.query("SELECT COUNT(*) AS count FROM rooms");
    const [[tenants]]  = await db.query("SELECT COUNT(*) AS count FROM tenants");
    const [[payments]] = await db.query("SELECT COUNT(*) AS count FROM payments");
    const [[users]]    = await db.query("SELECT COUNT(*) AS count FROM users");

    res.json({
      rooms: rooms.count,
      tenants: tenants.count,
      payments: payments.count,
      users: users.count
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/upcoming-dues", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const [rows] = await db.query(`
      SELECT t.id, t.full_name, t.email, r.room_number, r.type, t.created_at,
             DATE_ADD(t.created_at, INTERVAL 30 DAY) AS due_date
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.id
      WHERE t.status = 'approved'
        AND DATE_ADD(t.created_at, INTERVAL 30 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      ORDER BY due_date ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Upcoming dues error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;
