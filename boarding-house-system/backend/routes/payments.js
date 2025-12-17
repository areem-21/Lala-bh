const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload folder
const uploadDir = path.join(__dirname, "..", "uploads", "gcash_receipts");
fs.mkdirSync(uploadDir, { recursive: true });

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// JWT verify
const verifyTenant = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!["tenant", "client"].includes(decoded.role))
      return res.status(403).json({ message: "Forbidden" });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};


/* ===============================
   ADD PAYMENT
================================ */
router.post("/add", verifyTenant, upload.single("receipt"), async (req, res) => {
  try {
    const { amount, method, payment_type } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    const userId = req.user.id;

    const [tenantRows] = await db.query(
      "SELECT id FROM tenants WHERE user_id = ?",
      [userId]
    );

    if (!tenantRows.length)
      return res.status(404).json({ message: "Tenant not found" });

    const tenant_id = tenantRows[0].id;
    const receiptPath = req.file
      ? "/uploads/gcash_receipts/" + req.file.filename
      : null;

    await db.query(
      `INSERT INTO payments 
       (tenant_id, amount, method, receipt, status, payment_type, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        tenant_id,
        amount,
        method || "Cash",
        receiptPath,
        payment_type || "partial",
      ]
    );

    res.json({
      success: true,
      message: "Payment submitted",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   MY PAYMENTS
================================ */
/* ============================================
   TENANT — /my-payments
============================================ */
router.get("/my-payments", verifyTenant, async (req, res) => {
  try {
    const userId = req.user.id;

    const [tenantRows] = await db.query(
      `SELECT t.id AS tenant_id, t.balance,
              r.rate AS room_rate, r.room_number
       FROM tenants t
       LEFT JOIN rooms r ON r.id = t.room_id
       WHERE t.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!tenantRows.length)
      return res.status(404).json({ message: "Tenant not found" });

    const tenant = tenantRows[0];

    const [payments] = await db.query(
      `SELECT id, amount, method, receipt, status, payment_type, created_at
       FROM payments
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
      [tenant.tenant_id]
    );

    res.json({
      success: true,
      tenant: {
        tenant_id: tenant.tenant_id,
        balance: Number(tenant.balance || 0),   // ✅ use balance
        room_rate: Number(tenant.room_rate || 0),
        room_number: tenant.room_number,
      },
      payments,
    });
  } catch (err) {
    console.error("MY PAYMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
