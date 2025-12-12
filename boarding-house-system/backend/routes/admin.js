const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ADMIN STATS
router.get("/stats", (req, res) => {
    db.query("SELECT COUNT(*) AS rooms FROM rooms", (err, r1) => {
        db.query("SELECT COUNT(*) AS tenants FROM tenants", (err, r2) => {
            db.query("SELECT COUNT(*) AS payments FROM payments", (err, r3) => {
                db.query("SELECT COUNT(*) AS users FROM users", (err, r4) => {
                    res.json({
                        rooms: r1[0].rooms,
                        tenants: r2[0].tenants,
                        payments: r3[0].payments,
                        users: r4[0].users,
                    });
                });
            });
        });
    });
});

module.exports = router;
