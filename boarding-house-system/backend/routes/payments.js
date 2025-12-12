// backend/routes/payments.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create receipt folder
const uploadDir = path.join(__dirname, "..", "uploads", "gcash_receipts");
fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Verify tenant inline (compatible with your code)
const verifyTenant = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "client" && decoded.role !== "tenant")
      return res.status(403).json({ message: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/*
  POST /payments/add
  - Tenant submits payment; we store payment with status = 'pending'
  - Admin will approve/reject later; no balance deduction here
*/
router.post("/add", verifyTenant, upload.single("receipt"), (req, res) => {
  const { amount, method, payment_type } = req.body;
  const paymentAmount = parseFloat(amount);
  if (!paymentAmount || paymentAmount <= 0)
    return res.status(400).json({ message: "Invalid amount" });

  const userId = req.user.id;

  db.query("SELECT id FROM tenants WHERE user_id = ?", [userId], (err, tRows) => {
    if (err) {
      console.error("Tenant lookup error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    if (!tRows.length) return res.status(404).json({ message: "Tenant not found" });

    const tenant_id = tRows[0].id;
    const receiptPath = req.file ? "/uploads/gcash_receipts/" + req.file.filename : null;

    const insertSql = `
      INSERT INTO payments (tenant_id, amount, method, receipt, status, payment_type, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, NOW())
    `;
    db.query(insertSql, [tenant_id, paymentAmount, method || "Cash", receiptPath, payment_type || "partial"], (err2, result) => {
      if (err2) {
        console.error("Insert payment error:", err2);
        return res.status(500).json({ message: "Server error inserting payment" });
      }
      return res.json({ message: "Payment submitted", paymentId: result.insertId, status: "pending" });
    });
  });
});

/*
  GET /payments/my-payments
  - Return tenant current remaining_balance + payments array
  Response shape:
    { tenant: { tenant_id, remaining_balance, room_rate, room_number }, payments: [...] }
*/
router.get("/my-payments", verifyTenant, (req, res) => {
  const userId = req.user.id;

  const tenantQuery = `
    SELECT t.id AS tenant_id, t.remaining_balance, r.rate AS room_rate, r.room_number
    FROM tenants t
    LEFT JOIN rooms r ON r.id = t.room_id
    WHERE t.user_id = ?
    LIMIT 1
  `;

  db.query(tenantQuery, [userId], (err, tenantRows) => {
    if (err) {
      console.error("Tenant lookup error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    if (!tenantRows.length) return res.status(404).json({ message: "Tenant not found" });

    const tenant = tenantRows[0];

    const paymentsQuery = `
      SELECT id, amount, method, receipt, status, payment_type, created_at
      FROM payments
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `;

    db.query(paymentsQuery, [tenant.tenant_id], (err2, payments) => {
      if (err2) {
        console.error("Payments lookup error:", err2);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({
        tenant: {
          tenant_id: tenant.tenant_id,
          remaining_balance: Number(tenant.remaining_balance || 0),
          room_rate: Number(tenant.room_rate || 0),
          room_number: tenant.room_number || null,
        },
        payments: payments || [],
      });
    });
  });
});

module.exports = router;
