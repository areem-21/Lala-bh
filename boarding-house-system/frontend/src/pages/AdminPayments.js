// frontend/src/pages/AdminPayments.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const STATUS_BADGE = {
  pending: { text: "Pending", color: "#fbbf24" },
  partial: { text: "Partial", color: "#3b82f6" },
  paid: { text: "Paid", color: "#16a34a" },
  rejected: { text: "Rejected", color: "#ef4444" },
};

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [previewSrc, setPreviewSrc] = useState(null);
  const [toast, setToast] = useState(null);
  const token = localStorage.getItem("token");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/payments/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const showToast = (message, type = "info", ms = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  const approvePayment = async (id) => {
    if (!window.confirm("Approve this payment?")) return;
    try {
      const res = await API.patch(`/payments/admin/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Payment approved", "success");
      // update local payments list: set status + update tenant remaining_balance in entry
      setPayments(prev =>
        prev.map(p =>
          p.id === id ? { ...p, status: res.data.status, remaining_balance: res.data.remaining_balance } : p
        )
      );
    } catch (err) {
      console.error(err?.response?.data || err);
      showToast("Failed to approve", "error");
    }
  };

  const rejectPayment = async (id) => {
    if (!window.confirm("Reject this payment?")) return;
    try {
      const res = await API.patch(`/payments/admin/reject/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Payment rejected", "success");
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: res.data.status } : p));
    } catch (err) {
      console.error(err);
      showToast("Failed to reject", "error");
    }
  };

  const visiblePayments = useMemo(() => {
    let list = [...payments];
    if (filter !== "all") list = list.filter(p => p.status === filter);
    if (search.trim() !== "") {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        String(p.id).includes(q) || (p.tenant_name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a,b) => sort === "newest" ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [payments, filter, search, sort]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const badge = (status) => {
    const info = STATUS_BADGE[status] || { text: status, color: "#94a3b8" };
    return <span style={{ background: info.color, color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12, textTransform: "capitalize" }}>{info.text}</span>;
  };

  return (
    <div style={{ padding: 20, background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 15 }}>
        <Link to="/admin/dashboard"><button style={buttonStyle}>Back</button></Link>
      </div>
      <h1>Admin — Payment Management</h1>

      <div style={{ display: "flex", gap: 12, margin: "12px 0 18px", alignItems: "center" }}>
        <div><label>Filter:</label>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div><label>Sort:</label>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={inputStyle}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input placeholder="Search tenant name or id..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inputStyle, width:200}} />
          <button onClick={()=>{ setSearch(""); loadPayments(); }} style={buttonStyle}>Reset</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e6e6e6", borderRadius: 6, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead style={{ background: "#e5e7eb" }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Tenant</th>
              <th style={thStyle}>Room</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Remaining</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Receipt</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={11} style={{padding:20,textAlign:"center"}}>Loading...</td></tr> :
            visiblePayments.length === 0 ? <tr><td colSpan={11} style={{padding:20,textAlign:"center"}}>No payments found</td></tr> :
            visiblePayments.map(p => {
              const remaining = Number(p.remaining_balance || 0);
              return (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", background: "#f9fafb" }}>
                  <td style={tdStyle}>{p.id}</td>
                  <td style={tdStyle}>{p.tenant_name}</td>
                  <td style={tdStyle}>{p.room_number || "—"}</td>
                  <td style={tdStyle}>₱{Number(p.amount).toLocaleString()}</td>
                  <td style={tdStyle}>{remaining <= 0 ? "₱0" : `₱${remaining.toLocaleString()}`}</td>
                  <td style={tdStyle}>{p.method}</td>
                  <td style={tdStyle}>{p.payment_type}</td>
                  <td style={tdStyle}>{p.receipt ? <button onClick={()=>setPreviewSrc(`${BACKEND_URL}${p.receipt}`)} style={buttonStyle}>View</button> : "None"}</td>
                  <td style={tdStyle}>{badge(p.status)}</td>
                  <td style={tdStyle}>{new Date(p.created_at).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {p.status === "pending" || p.status === "partial" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => approvePayment(p.id)} style={buttonStyle}>Approve</button>
                        <button onClick={() => rejectPayment(p.id)} style={buttonStyle}>Reject</button>
                      </div>
                    ) : <span style={{ color: "#6b7280" }}>No Action</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewSrc && (
        <div style={modalOverlayStyle} onClick={() => setPreviewSrc(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "right" }}><button onClick={() => setPreviewSrc(null)} style={buttonStyle}>Close</button></div>
            <img src={previewSrc} alt="receipt" style={{ maxWidth: "100%", maxHeight: "70vh" }} />
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", right:20, bottom:20, padding:12, borderRadius:8, background: toast.type === "error" ? "#ef4444" : "#16a34a", color:"#fff" }}>{toast.message}</div>}
    </div>
  );
};

const thStyle = { padding: "12px 10px", textAlign: "left", fontWeight: 600, fontSize: 13 };
const tdStyle = { padding: "10px", verticalAlign: "middle", fontSize: 14 };
const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" };
const buttonStyle = { padding: "6px 12px", borderRadius: 6, border: "none", background: "#374151", color: "#fff", cursor: "pointer" };
const modalOverlayStyle = { position: "fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 };
const modalContentStyle = { width:"90%", maxWidth:900, background:"#fff", padding:16, borderRadius:8 };

export default AdminPayments;
