const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("USERS LIST ERROR:", err);
    res.status(500).json({ message: "Server error while fetching users." });
  }
});

// Update user (admin)
router.put('/update/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;
  try {
    await db.query(
      `UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?`,
      [name, email, role, status, id]
    );
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('UPDATE USER ERROR:', err);
    res.status(500).json({ message: 'Server error while updating user.' });
  }
});

// Delete user (admin)
router.delete('/delete/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ message: 'Server error while deleting user.' });
  }
});

module.exports = router;
