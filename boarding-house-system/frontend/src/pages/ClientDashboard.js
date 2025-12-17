import React, { useEffect, useState, useCallback } from "react";
import API from "../api";

const ClientDashboard = () => {
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await API.get("/client/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user); // backend now returns { user: ... }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error fetching data");
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  useEffect(() => {
    if (role !== "client") {
      alert("Access Denied. Clients Only.");
      window.location.href = "/";
    }
    fetchDashboard();
  }, [fetchDashboard, role]);

  if (!user)
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>
    );

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "230px",
          background: "#374151",
          color: "white",
          padding: "20px",
          position: "sticky",
          top: 0,
          height: "100vh"
        }}
      >
        <h2
          style={{ textAlign: "center", fontWeight: "bold", color: "#f3f4f6" }}
        >
          Client Panel
        </h2>

        <ul style={{ listStyle: "none", padding: 0, marginTop: "30px" }}>
          <li style={{ marginBottom: "12px" }}>
            <a href="/client/dashboard" style={linkStyle}>
              Dashboard
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
  <a href="/client/my-request" style={linkStyle}>
    My Room Request
  </a>
</li>

          <li style={{ marginBottom: "12px" }}>
            <a href="/client/request-room" style={linkStyle}>
              Request Room
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/client/payments" style={linkStyle}>
              Payments
            </a>
          </li>

          <button
            onClick={handleLogout}
            style={{
              marginTop: "20px",
              width: "100%",
              background: "#9ca3af",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              color: "white"
            }}
          >
            Logout
          </button>
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ padding: "20px", flexGrow: 1 }}>
        <h1 style={{ color: "#1f2937" }}>Welcome, {user.name}</h1>

        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
          }}
        >
          <h2 style={{ color: "#1f2937" }}>My Account Details</h2>

          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
          <p>
            <strong>Status:</strong> {user.status}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(user.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const linkStyle = {
  color: "white",
  textDecoration: "none",
  fontSize: "15px"
};

export default ClientDashboard;
