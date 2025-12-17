// backend/routes/adminPayments.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload folder for receipts
const uploadDir = path.join(__dirname, "..", "uploads", "gcash_receipts");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Admin middleware (inline)
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

// GET /payments/admin/all
router.get("/all", verifyAdmin, async (req, res) => {
  const query = `
    SELECT 
      p.id, p.amount, p.method, p.receipt, p.status, p.created_at, p.payment_type,
      t.id AS tenant_id, t.full_name AS tenant_name, r.room_number, r.rate AS room_rate,
      t.balance
    FROM payments p
    JOIN tenants t ON t.id = p.tenant_id
    LEFT JOIN rooms r ON r.id = t.room_id
    ORDER BY p.created_at DESC
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error("DB SELECT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================
   ADMIN — Approve Payment
============================================ */
router.patch("/approve/:id", verifyAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;

    const getPaymentSql = `
      SELECT p.id, p.amount, p.status, p.tenant_id, r.rate AS room_rate, t.balance
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
      LEFT JOIN rooms r ON r.id = t.room_id
      WHERE p.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(getPaymentSql, [paymentId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const p = rows[0];

    if (p.status === "paid" || p.status === "rejected") {
      return res.status(400).json({ success: false, message: `Payment already ${p.status}` });
    }

    // If tenant.balance is 0 (not initialized), set it to room_rate
    let currentBalance = Number(p.balance || 0);
    const roomRate = Number(p.room_rate || 0);
    if (currentBalance === 0) currentBalance = roomRate;

    // compute new balance
    const amount = Number(p.amount || 0);
    let newBalance = currentBalance - amount;
    if (newBalance < 0) newBalance = 0;

    // determine new status
    const newStatus = newBalance === 0 ? "paid" : "partial";

    // update tenant balance
    await db.query(
      `UPDATE tenants SET balance = ? WHERE id = ?`,
      [newBalance, p.tenant_id]
    );

    // update payment
    await db.query(
      `UPDATE payments SET status = ? WHERE id = ?`,
      [newStatus, paymentId]
    );

    return res.json({
      success: true,
      message: "Payment approved",
      status: newStatus,
      balance: newBalance,   // ✅ return balance
    });
  } catch (err) {
    console.error("APPROVE PAYMENT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error approving payment" });
  }
});



// PATCH /payments/admin/reject/:id
router.patch("/reject/:id", verifyAdmin, (req, res) => {
  const paymentId = req.params.id;
  db.query("SELECT status FROM payments WHERE id = ?", [paymentId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!rows.length) return res.status(404).json({ message: "Payment not found" });
    if (rows[0].status === "paid" || rows[0].status === "rejected") {
      return res.status(400).json({ message: `Payment already ${rows[0].status}` });
    }
    db.query("UPDATE payments SET status='rejected' WHERE id = ?", [paymentId], (err2) => {
      if (err2) return res.status(500).json({ message: "Server error" });
      res.json({ message: "Payment rejected", status: "rejected" });
    });
  });
});

/* ============================================
   ADMIN — Add Payment (admin can add payment for a tenant)
============================================ */
router.post("/add", verifyAdmin, upload.single("receipt"), async (req, res) => {
  try {
    const { tenant_id, amount, method, payment_type } = req.body;

    if (!tenant_id) return res.status(400).json({ success: false, message: "tenant_id is required" });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });

    // verify tenant exists
    const [tRows] = await db.query("SELECT id FROM tenants WHERE id = ? LIMIT 1", [tenant_id]);
    if (!tRows.length) return res.status(404).json({ success: false, message: "Tenant not found" });

    const receiptPath = req.file ? "/uploads/gcash_receipts/" + req.file.filename : null;

    await db.query(
      `INSERT INTO payments (tenant_id, amount, method, receipt, status, payment_type, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
      [tenant_id, amount, method || 'Cash', receiptPath, payment_type || 'partial']
    );

    return res.json({ success: true, message: "Payment added" });
  } catch (err) {
    console.error("ADMIN ADD PAYMENT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error adding payment" });
  }
});

/* ============================================
   ADMIN — Revenue
   Query params: month (1-12) or start (ISO) and end (ISO)
============================================ */
router.get('/revenue', verifyAdmin, async (req, res) => {
  try {
    const { month, start, end } = req.query;
    const params = [];

    let where = "WHERE p.status IN ('partial','paid')";

    if (month) {
      where += ' AND MONTH(p.created_at) = ? AND YEAR(p.created_at) = ?';
      params.push(parseInt(month, 10), new Date().getFullYear());
    } else if (start && end) {
      where += ' AND p.created_at BETWEEN ? AND ?';
      params.push(start, end);
    }

    const totalSql = `
      SELECT IFNULL(SUM(p.amount), 0) AS total_amount, COUNT(*) AS payments_count
      FROM payments p
      ${where}
    `;

    const [totalRows] = await db.query(totalSql, params);
    const totals = totalRows[0] || { total_amount: 0, payments_count: 0 };

    const breakdownSql = `
      SELECT p.status, IFNULL(SUM(p.amount),0) AS total_amount, COUNT(*) AS count
      FROM payments p
      ${where}
      GROUP BY p.status
    `;
    const [breakdownRows] = await db.query(breakdownSql, params);

    return res.json({
      success: true,
      total: Number(totals.total_amount),
      count: Number(totals.payments_count),
      breakdown: breakdownRows || [],
    });
  } catch (err) {
    console.error('REVENUE ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error calculating revenue' });
  }
});

module.exports = router;


