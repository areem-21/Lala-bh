import React, { useEffect, useState, useCallback } from "react";
import API from "../api";

const MyRoomRequest = () => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const fetchMyRequest = useCallback(async () => {
    try {
      const res = await API.get("/tenants/my-request", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.message === "No request found") {
        setRequest(null);
      } else {
        setRequest(res.data);
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching request");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  useEffect(() => {
    if (role !== "client" && role !== "tenant") {
      alert("Access Denied. Clients Only.");
      window.location.href = "/";
    }
    fetchMyRequest();
  }, [fetchMyRequest, role]);

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Tenant Panel</h2>
        <ul style={styles.sidebarList}>
          <li><a href="/client/dashboard" style={styles.link}>Dashboard</a></li>
          <li><a href="/client/request-room" style={styles.link}>My Room Request</a></li>
          <li><a href="/client/payments" style={styles.link}>Payments</a></li>
          <li>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <h1 style={styles.title}>My Room Request Status</h1>
        {!request ? (
          <p style={styles.noRequest}>You currently have no room request.</p>
        ) : (
          <div style={styles.card}>
            <p><strong>Full Name:</strong> {request.full_name}</p>
            <p><strong>Email:</strong> {request.email}</p>
            <p><strong>Phone:</strong> {request.phone}</p>
            <p><strong>Gender:</strong> {request.gender}</p>
            <p><strong>Address:</strong> {request.address}</p>
            <p><strong>Emergency Contact:</strong> {request.emergency_contact}</p>
            <p><strong>Room:</strong> {request.room_number ? `${request.room_number} (${request.type})` : "Not Assigned"}</p>
            <p><strong>Rate:</strong> {request.rate || "-"}</p>
            <p><strong>Status:</strong> {request.status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 🌟 Gray & White Mobile-Friendly Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "row",
    minHeight: "100vh",
    background: "#f3f4f6",
    flexWrap: "wrap",
  },
  sidebar: {
    width: "220px",
    background: "#374151",
    color: "white",
    padding: "20px",
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "25px",
    textAlign: "center",
  },
  sidebarList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  link: {
    color: "white",
    textDecoration: "none",
    display: "block",
    padding: "8px 0",
    fontSize: "15px",
  },
  logoutButton: {
    marginTop: "20px",
    width: "100%",
    background: "#9ca3af",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    color: "white",
  },
  main: {
    padding: "20px",
    flexGrow: 1,
    minWidth: "300px",
  },
  title: {
    color: "#1f2937",
    marginBottom: "20px",
  },
  noRequest: {
    color: "#4b5563",
  },
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    marginBottom: "20px",
  },
};

export default MyRoomRequest;
