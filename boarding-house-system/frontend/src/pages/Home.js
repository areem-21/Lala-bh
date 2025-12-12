import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: "450px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#1f2937", marginBottom: "10px" }}>
          Boarding House Management System
        </h1>

        <p style={{ color: "#4b5563", marginBottom: "30px", fontSize: "15px" }}>
          Manage tenants, rooms, payments, and assignments in one secure system.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <Link to="/login">
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "#374151",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Login
            </button>
          </Link>

          <Link to="/register">
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Register
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
