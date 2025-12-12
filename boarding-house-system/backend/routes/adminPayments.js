// backend/routes/adminPayments.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

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
router.get("/all", verifyAdmin, (req, res) => {
  const query = `
    SELECT 
      p.id, p.amount, p.method, p.receipt, p.status, p.created_at, p.payment_type,
      t.id AS tenant_id, t.full_name AS tenant_name, r.room_number, r.rate AS room_rate,
      t.remaining_balance
    FROM payments p
    JOIN tenants t ON t.id = p.tenant_id
    LEFT JOIN rooms r ON r.id = t.room_id
    ORDER BY p.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("DB SELECT error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

// PATCH /payments/admin/approve/:id
// Deduct tenant.remaining_balance by payment.amount when admin approves
router.patch("/approve/:id", verifyAdmin, (req, res) => {
  const paymentId = req.params.id;

  // get payment + tenant remaining + room rate
  const getPaymentSql = `
    SELECT p.id, p.amount, p.status, p.tenant_id, r.rate AS room_rate, t.remaining_balance
    FROM payments p
    JOIN tenants t ON t.id = p.tenant_id
    LEFT JOIN rooms r ON r.id = t.room_id
    WHERE p.id = ?
    LIMIT 1
  `;

  db.query(getPaymentSql, [paymentId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
    if (!rows.length) return res.status(404).json({ message: "Payment not found" });

    const p = rows[0];

    // can't approve if already final
    if (p.status === "paid" || p.status === "rejected") {
      return res.status(400).json({ message: `Payment already ${p.status}` });
    }

    // If tenant.remaining_balance is 0 (not initialized), set it to room_rate
    let currentRemaining = Number(p.remaining_balance || 0);
    const roomRate = Number(p.room_rate || 0);
    if (currentRemaining === 0) currentRemaining = roomRate;

    // compute new remaining
    const amount = Number(p.amount || 0);
    let newRemaining = currentRemaining - amount;
    if (newRemaining < 0) newRemaining = 0;

    // determine new status
    const newStatus = newRemaining === 0 ? "paid" : "partial";

    // update tenant.remaining_balance
    // If paid and we want to auto-reset for next cycle, reset to roomRate.
    // If you prefer to keep 0 until next month, change assignment accordingly.
    const remainingToSave = newRemaining === 0 ? roomRate : newRemaining;

    db.query(
      `UPDATE tenants SET remaining_balance = ? WHERE id = ?`,
      [remainingToSave, p.tenant_id],
      (err2) => {
        if (err2) {
          console.error("Update tenant error:", err2);
          return res.status(500).json({ message: "Server error updating tenant" });
        }

        // update payment status
        db.query(
          `UPDATE payments SET status = ? WHERE id = ?`,
          [newStatus, paymentId],
          (err3) => {
            if (err3) {
              console.error("Update payment error:", err3);
              return res.status(500).json({ message: "Server error updating payment" });
            }

            // respond with updated remaining balance (what tenant will see after approval)
            res.json({
              message: "Payment approved",
              status: newStatus,
              remaining_balance: remainingToSave,
            });
          }
        );
      }
    );
  });
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

module.exports = router;
