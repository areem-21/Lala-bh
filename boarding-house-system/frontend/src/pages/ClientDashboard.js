import React, { useEffect, useState, useCallback } from "react";
import API from "../api";

const ClientDashboard = () => {
  const [tenant, setTenant] = useState(null);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await API.get("/client/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenant(res.data.tenant);
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

  if (!tenant)
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
          Tenant Panel
        </h2>

        <ul style={{ listStyle: "none", padding: 0, marginTop: "30px" }}>
          <li style={{ marginBottom: "12px" }}>
            <a href="/client/dashboard" style={linkStyle}>
              Dashboard
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/client/my-request" style={linkStyle}>
              My Requests
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
        <h1 style={{ color: "#1f2937" }}>Welcome, {tenant.tenant_name}</h1>

        {/* Room Details */}
        {tenant.room_number ? (
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
            }}
          >
            <h2 style={{ color: "#1f2937" }}>My Room Details</h2>

            <p>
              <strong>Room Number:</strong> {tenant.room_number}
            </p>
            <p>
              <strong>Type:</strong> {tenant.type}
            </p>
            <p>
              <strong>Rate:</strong> ₱{tenant.rate}
            </p>
            <p>
              <strong>Status:</strong> {tenant.status}
            </p>

            {/* Room Inclusions */}
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f9fafb",
                borderRadius: "10px",
                border: "1px solid #e5e7eb"
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>Room Inclusions</h3>
              <ul style={{ marginLeft: "20px" }}>
                <li>Free Electricity (Shared)</li>
                <li>Free Water</li>
                <li>Free Wi-Fi</li>
                <li>Bed Space / Room Assignment</li>
                <li>Use of Common CR & Kitchen</li>
              </ul>
            </div>

            {/* Rules & Regulations */}
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#fef2f2",
                borderRadius: "10px",
                border: "1px solid #fecaca"
              }}
            >
              <h3 style={{ marginBottom: "10px", color: "#b91c1c" }}>
                Boarding House Rules & Regulations
              </h3>
              <ul style={{ marginLeft: "20px" }}>
                <li>No loud noise after 10 PM</li>
                <li>No cooking inside the room</li>
                <li>No bringing of visitors without permission</li>
                <li>Maintain cleanliness in shared areas</li>
                <li>Damages to property must be reported immediately</li>
                <li>Late payments may result in penalties</li>
              </ul>
            </div>
          </div>
        ) : (
          <p style={{ marginTop: "20px", color: "#4b5563" }}>
            You currently have no room assigned.
          </p>
        )}
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
