const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware to verify client token
const verifyClient = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "client") return res.status(403).json({ message: "Forbidden" });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

router.get("/dashboard", verifyClient, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT u.name AS tenant_name, u.email AS tenant_email
        FROM users u
        WHERE u.id = ?
        LIMIT 1
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("DB ERROR:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.json({ tenant: null });
        }

        res.json({ tenant: results[0] });
    });
});


module.exports = router;
