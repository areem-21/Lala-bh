
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
const usersRoutes = require("./routes/users");
app.use("/api/users", usersRoutes);   // ✅ ensures /api/users/all works
const roomsRoutes = require("./routes/rooms");
app.use("/api/rooms", roomsRoutes);
const tenantsRoutes = require("./routes/tenants");
app.use("/api/tenants", tenantsRoutes);
const paymentsRoutes = require("./routes/payments");

// Mount under /api/payments
app.use("/api/payments", paymentsRoutes);
const tenantsRouter = require("./routes/tenants");
app.use("/tenants", tenantsRouter);


// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/client", require("./routes/client"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/payments/admin", require("./routes/adminPayments"));
app.use("/uploads", express.static("uploads"));

app.use("/api/payments/admin", require("./routes/adminPayments"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/admin", require("./routes/tenants"));

// Expenses routes
app.use("/api/expenses", require("./routes/expenses"));

app.listen(5000, () => console.log("Server running on port 5000"));
