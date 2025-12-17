const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// POST /expenses/add
router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const { title, amount, category, notes } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });

    await db.query(
      `INSERT INTO expenses (title, amount, category, notes, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [title, amount, category || null, notes || null]
    );

    return res.json({ success: true, message: "Expense added" });
  } catch (err) {
    console.error("ADD EXPENSE ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error adding expense" });
  }
});

// GET /expenses/all
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, amount, category, notes, created_at
       FROM expenses
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET EXPENSES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /expenses/update/:id
router.put('/update/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, notes } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const [result] = await db.query(
      `UPDATE expenses SET title = ?, amount = ?, category = ?, notes = ? WHERE id = ?`,
      [title, amount, category || null, notes || null, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Expense not found' });

    return res.json({ success: true, message: 'Expense updated' });
  } catch (err) {
    console.error('UPDATE EXPENSE ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error updating expense' });
  }
});

// DELETE /expenses/delete/:id
router.delete('/delete/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM expenses WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Expense not found' });
    return res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error('DELETE EXPENSE ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting expense' });
  }
});

module.exports = router;
