import React, { useEffect, useState, useCallback } from "react";
import API from "../api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ rooms: 0, tenants: 0, payments: 0, users: 0 });
  const [pendingTenants, setPendingTenants] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // assign modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTenant, setAssignTenant] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");

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

  // Fetch upcoming dues
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

    const interval = setInterval(fetchUpcomingDues, 60000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchPendingTenants, fetchUpcomingDues, role]);

  // Toggle notification dropdown
  const toggleNotif = () => setShowNotifDropdown(s => !s);

  const approveTenant = async (id) => {
    if (!window.confirm("Approve this tenant?")) return;
    try {
      await API.patch(`/tenants/approve/${id}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPendingTenants();
      alert("Tenant approved!");
    } catch (err) {
      console.error(err);
      alert("Error approving tenant");
    }
  };

  const notifyTenant = async (tenant) => {
    if (!tenant || !tenant.email) return alert('No email for this tenant');
    if (!window.confirm(`Send notification to ${tenant.email}?`)) return;
    try {
      await API.post('/tenants/notify-email', { to: tenant.email, subject: 'Upcoming Rent Due', message: `Hello ${tenant.full_name}, your rent is due on ${new Date(tenant.due_date).toLocaleDateString()}. Please prepare payment.` }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Notification sent');
    } catch (err) {
      console.error('Notify tenant error:', err);
      alert('Failed to send notification');
    }
  };

  // Open assign modal
  const openAssignModal = async (tenantId) => {
    try {
      const res = await API.get("/rooms/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter((r) => r.capacity > r.occupied_count);
      setAvailableRooms(filtered);
      setAssignTenant(tenantId);
      setShowAssignModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load rooms");
    }
  };

  // Assign room
  const handleAssignRoom = async () => {
    if (!selectedRoom) return alert("Please select a room");
    try {
      await API.post(
        "/rooms/assign",
        {
          tenant_id: assignTenant,
          room_id: selectedRoom,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowAssignModal(false);
      setAssignTenant(null);
      setSelectedRoom("");
      fetchPendingTenants();
      alert("Tenant reassigned successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to assign tenant.");
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
          <li style={linkItem}><a href="/admin/expenses" style={linkStyle}>Expenses</a></li>
          <li style={linkItem}><a href="/users" style={linkStyle}>Users</a></li>
          <button onClick={handleLogout} style={logoutButton}>Logout</button>
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ padding: "20px", flexGrow: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button onClick={toggleNotif} style={{ fontSize: 20, padding: '6px 10px', borderRadius: 8 }}>
              🔔 {upcomingDues.length > 0 && <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 12 }}>{upcomingDues.length}</span>}
            </button>
            {showNotifDropdown && (
              <div style={{ position: 'absolute', right: 0, top: 40, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', width: 360, borderRadius: 8, padding: 8, zIndex: 40 }}>
                <h4 style={{ margin: '6px 0' }}>Upcoming Dues (3 days)</h4>
                {upcomingDues.length === 0 ? <div style={{ padding: 8 }}>No upcoming dues</div> : (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {upcomingDues.map(td => (
                      <div key={td.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #eee' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{td.full_name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{td.room_number || 'No room'} • Due: {new Date(td.due_date).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => notifyTenant(td)} style={{ padding: '6px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Notify</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px" }}>
          <Card title="Rooms" value={stats.rooms} />
          <Card title="Tenants" value={stats.tenants} />
          <Card title="Payments" value={stats.payments} />
          <Card title="Users" value={stats.users} />
        </div>

        {/* Pending Tenants */}
        <h2 style={{ marginTop: "40px" }}>Pending Tenant Requests</h2>

        {pendingTenants.length === 0 ? (
          <p>No pending tenants.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
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
                <tr key={t.id}>
                  <td style={tableCell}>{t.full_name}</td>
                  <td style={tableCell}>{t.email}</td>
                  <td style={tableCell}>{t.phone}</td>
                  <td style={tableCell}>{t.room_number} ({t.type})</td>
                  <td style={tableCell}>{t.status}</td>
                  <td style={tableCell}>
                    <button onClick={() => approveTenant(t.id)} style={approveButton}>Approve</button>
                    <button onClick={() => openAssignModal(t.id)} style={assignButton}>Assign Room</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div style={modalOverlay}>
            <div style={modalContent}>
              <h3>Select Room</h3>
              <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                <option value="">Select room</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} ({r.type})
                  </option>
                ))}
              </select>
              <div style={{ marginTop: "10px" }}>
                <button onClick={handleAssignRoom} style={approveButton}>Assign</button>
                <button onClick={() => setShowAssignModal(false)} style={logoutButton}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Reusable Card ---------- */
const Card = ({ title, value }) => (
  <div style={cardStyle}>
    <h3>{title}</h3>
    <h1>{value}</h1>
  </div>
);

/* ---------- Styles ---------- */
const sidebarStyle = {
  width: "220px",
  background: "#111827",
  color: "#fff",
  padding: "20px",
};

const linkItem = { marginBottom: "10px" };
const linkStyle = { color: "#fff", textDecoration: "none" };

const logoutButton = {
  marginTop: "20px",
  width: "100%",
  padding: "10px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
};

const approveButton = {
  marginRight: "5px",
  padding: "6px 10px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
};

const assignButton = {
  padding: "6px 10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
};

const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "10px", border: '1px solid #e5e7eb' };
const tableHead = { padding: "10px", background: "#f8fafc", border: '1px solid #e5e7eb', textAlign: 'left' };
const tableCell = { padding: "10px", border: '1px solid #e5e7eb' };

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContent = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  width: "300px",
};

const cardStyle = {
  background: "#e5e7eb",
  padding: "20px",
  borderRadius: "12px",
  textAlign: "center",
};

export default AdminDashboard;
