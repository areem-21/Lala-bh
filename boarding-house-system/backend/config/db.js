const mysql = require('mysql2');

// Create a connection pool (better for production)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS, // Support both variable names
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, // 60 seconds - Railway proxy may need more time
  // Important for Railway public proxy
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection - FIX: Use promise() first
const promisePool = db.promise();

promisePool.getConnection()
  .then(connection => {
    console.log("MySQL Connected successfully!");
    connection.release();
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
  });

// Export the promise-based pool
module.exports = promisePool;