import React, { useEffect, useState, useCallback } from "react";
import API from "../api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ rooms: 0, tenants: 0, payments: 0, users: 0 });
  const [pendingTenants, setPendingTenants] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  // Fetch pending tenants
  const fetchPendingTenants = useCallback(async () => {
    try {
      const res = await API.get("/tenants/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingTenants(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  // Fetch upcoming dues for notifications
  const fetchUpcomingDues = useCallback(async () => {
    try {
      const res = await API.get("/admin/upcoming-dues", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUpcomingDues(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (role !== "admin") {
      alert("Access Denied. Admins Only.");
      window.location.href = "/";
    }
    fetchStats();
    fetchPendingTenants();
    fetchUpcomingDues();

    const interval = setInterval(fetchUpcomingDues, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchStats, fetchPendingTenants, fetchUpcomingDues, role]);

  const approveTenant = async (id) => {
    if (!window.confirm("Approve this tenant?")) return;
    try {
      await API.patch(`/tenants/approve/${id}`, null, { headers: { Authorization: `Bearer ${token}` } });
      fetchPendingTenants();
      alert("Tenant approved!");
    } catch (err) {
      console.error(err);
      alert("Error approving tenant");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <h2 style={{ textAlign: "center", fontWeight: "bold" }}>Admin Panel</h2>
        <ul style={{ listStyle: "none", padding: 0, marginTop: "30px" }}>
          <li style={linkItem}><a href="/admin-dashboard" style={linkStyle}>Dashboard</a></li>
          <li style={linkItem}><a href="/rooms" style={linkStyle}>Rooms</a></li>
          <li style={linkItem}><a href="/tenants" style={linkStyle}>Tenants</a></li>
          <li style={linkItem}><a href="/admin/payments" style={linkStyle}>Payments</a></li>
          <li style={linkItem}><a href="/users" style={linkStyle}>Users</a></li>
          <button onClick={handleLogout} style={logoutButton}>Logout</button>
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ padding: "20px", flexGrow: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ color: "#1f2937" }}>Admin Dashboard</h1>

          {/* Notification Bell */}
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
            🔔
            {upcomingDues.length > 0 && (
              <span style={badgeStyle}>{upcomingDues.length}</span>
            )}
            {showNotifDropdown && (
              <div style={notifDropdownStyle}>
                <h4 style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Upcoming Dues</h4>
                {upcomingDues.length === 0 ? <p style={{ padding: "10px" }}>No upcoming dues</p> :
                  upcomingDues.map(t => (
                    <div key={t.id} style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                      <strong>{t.full_name}</strong> - {t.room_number} ({t.type}) <br/>
                      <small>{new Date(t.created_at).toLocaleDateString()}</small>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px", marginTop: "20px" }}>
          <Card bg="#e5e7eb" color="#1f2937" title="Rooms" value={stats.rooms} />
          <Card bg="#e5e7eb" color="#1f2937" title="Tenants" value={stats.tenants} />
          <Card bg="#e5e7eb" color="#1f2937" title="Payments" value={stats.payments} />
          <Card bg="#e5e7eb" color="#1f2937" title="Users" value={stats.users} />
        </div>

        {/* Pending Tenants Table */}
        <h2 style={{ marginTop: "40px", color: "#1f2937" }}>Pending Tenant Requests</h2>
        {pendingTenants.length === 0 ? (
          <p>No pending tenants.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "10px" }}>
            <table style={tableStyle}>
              <thead style={{ background: "#d1d5db", color: "#1f2937" }}>
                <tr>
                  <th style={tableHead}>Name</th>
                  <th style={tableHead}>Email</th>
                  <th style={tableHead}>Phone</th>
                  <th style={tableHead}>Room</th>
                  <th style={tableHead}>Status</th>
                  <th style={tableHead}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTenants.map((t) => (
                  <tr key={t.id} style={{ background: "#fff" }}>
                    <td style={tableCell}>{t.full_name}</td>
                    <td style={tableCell}>{t.email}</td>
                    <td style={tableCell}>{t.phone}</td>
                    <td style={tableCell}>{t.room_number} ({t.type})</td>
                    <td style={tableCell}>{t.status}</td>
                    <td style={tableCell}>
                      {t.status === "pending" && (
                        <button onClick={() => approveTenant(t.id)} style={approveButton}>Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Card
const Card = ({ bg, color, title, value }) => (
  <div style={{ background: bg, color: color, padding: "20px", borderRadius: "12px", textAlign: "center" }}>
    <h3>{title}</h3>
    <h1>{value}</h1>
  </div>
);

// Styles
const sidebarStyle = { width: "230px", background: "#1f2937", color: "white", padding: "20px", position: "sticky", top: 0, height: "100vh" };
const linkStyle = { color: "white", textDecoration: "none" };
const linkItem = { marginBottom: "12px" };
const logoutButton = { marginTop: "20px", width: "100%", background: "#facc15", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" };
const tableStyle = { width: "100%", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden" };
const tableHead = { padding: "10px", fontWeight: "bold" };
const tableCell = { padding: "10px", borderBottom: "1px solid #ddd" };
const approveButton = { background: "#16a34a", border: "none", padding: "6px 12px", color: "white", borderRadius: "6px", cursor: "pointer" };
const badgeStyle = { position: "absolute", top: "-5px", right: "-5px", background: "red", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "12px", fontWeight: "bold" };
const notifDropdownStyle = { position: "absolute", top: "25px", right: "0", background: "white", color: "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", borderRadius: "8px", width: "300px", zIndex: 1000, maxHeight: "300px", overflowY: "auto" };

export default AdminDashboard;
