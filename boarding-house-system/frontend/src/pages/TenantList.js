import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom"; // ✅ add this import
import API from "../api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdminTenant = () => {
  const [tenants, setTenants] = useState([]);
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");

  const fetchTenants = useCallback(async () => {
    try {
      let url = "/tenants/all?";
      if (month) url += `month=${month}&`;
      if (search) url += `search=${search}&`;

      const res = await API.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenants(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching tenants");
    }
  }, [month, search, token]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const notifyAnyEmail = async () => {
    const to = prompt("Enter recipient email:");
    const subject = prompt("Enter subject:");
    const message = prompt("Enter message:");
    if (!to || !subject || !message) return;

    try {
      await API.post(`/tenants/notify-email`, { to, subject, message }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Notification sent to ${to}`);
    } catch (err) {
      console.error(err);
      alert("Failed to send notification");
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tenants);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants");
    XLSX.writeFile(wb, "Tenants.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Tenant List", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Name", "Email", "Phone", "Room", "Status"]],
      body: tenants.map(t => [
        t.full_name,
        t.email,
        t.phone,
        t.room_number ? `${t.room_number} (${t.type})` : "Not Assigned",
        t.status
      ])
    });
    doc.save("Tenants.pdf");
  };

  return (
    <div style={styles.container}>

  {/* Back Button aligned left */}
  <div style={{ display: "flex", justifyContent: "flex-start" }}>
    <Link to="/admin/dashboard">
      <button style={styles.backButton}>Back</button>
    </Link>
  </div>

  <h1 style={styles.title}>Tenants List</h1>

      <div style={styles.controls}>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={styles.select}>
          <option value="">All Months</option>
          {[...Array(12).keys()].map(i => (
            <option key={i} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <button onClick={fetchTenants} style={styles.button}>Filter/Search</button>
        <button onClick={notifyAnyEmail} style={styles.button}>Notify Email</button>
        <button onClick={exportExcel} style={styles.button}>Export Excel</button>
        <button onClick={exportPDF} style={styles.button}>Export PDF</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Room</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{t.full_name}</td>
                <td style={styles.td}>{t.email}</td>
                <td style={styles.td}>{t.phone}</td>
                <td style={styles.td}>{t.room_number ? `${t.room_number} (${t.type})` : "Not Assigned"}</td>
                <td style={styles.td}>{t.status}</td>
                <td style={styles.td}>{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 🌟 Styles (unchanged except backButton added)
const styles = {
  container: {
    padding: "20px",
    background: "#f3f4f6",
    minHeight: "100vh",
  },

  backButton: {
    background: "#374151",
    color: "white",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    marginBottom: "15px",
    fontWeight: "bold",
  },

  title: {
    color: "#1f2937",
    marginBottom: "20px",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
    flex: "1 1 200px",
  },
  select: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
    flex: "1 1 150px",
  },
  button: {
    padding: "10px 15px",
    background: "#4b5563",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    flex: "1 1 120px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb'
  },
  thead: { background: '#f8fafc' },
  th: { textAlign: 'left', padding: '12px 16px', border: '1px solid #e5e7eb', background: '#f8fafc', color: '#374151' },
  td: { padding: '12px 16px', border: '1px solid #e5e7eb', color: '#111827' },
  tr: { background: '#fff' },
  primaryButton: { padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  exportSmall: { padding: '8px 10px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
};

export default AdminTenant;
