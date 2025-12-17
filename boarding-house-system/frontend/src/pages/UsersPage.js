import React, { useEffect, useState } from "react";
import API from "../api";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("client");
  const [formStatus, setFormStatus] = useState("active");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get("/users/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Error fetching users:", err);
        alert("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const reload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/users/all", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormName(u.name || "");
    setFormEmail(u.email || "");
    setFormRole(u.role || "client");
    setFormStatus(u.status || "active");
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    const token = localStorage.getItem("token");
    try {
      await API.put(`/users/update/${editingUser.id}`, { name: formName, email: formEmail, role: formRole, status: formStatus }, { headers: { Authorization: `Bearer ${token}` } });
      alert('User updated');
      setShowEdit(false);
      setEditingUser(null);
      reload();
    } catch (err) {
      console.error('Update user error:', err);
      alert('Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    const token = localStorage.getItem("token");
    try {
      await API.delete(`/users/delete/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      alert('User deleted');
      reload();
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Failed to delete user');
    }
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Users List</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>ID</th>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>Role</th>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: 10, border: '1px solid #e5e7eb' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{u.id}</td>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{u.name}</td>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{u.email}</td>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{u.role}</td>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{u.status}</td>
                <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{new Date(u.created_at).toLocaleString()}</td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>
                        <button onClick={() => openEdit(u)} style={{ marginRight: 8 }}>Edit</button>
                        <button onClick={() => handleDelete(u.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6 }}>Delete</button>
                      </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
            {showEdit && (
              <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
                <h3>Edit User</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input placeholder="Name" value={formName} onChange={e => setFormName(e.target.value)} />
                  <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                  <select value={formRole} onChange={e => setFormRole(e.target.value)}>
                    <option value="admin">admin</option>
                    <option value="client">client</option>
                  </select>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleUpdate} style={{ padding: '8px 12px' }}>Save</button>
                    <button onClick={() => { setShowEdit(false); setEditingUser(null); }} style={{ padding: '8px 12px' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
};

export default UsersPage;
