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
  const [showAddModal, setShowAddModal] = useState(false);
  const [tenantIdInput, setTenantIdInput] = useState("");
  const [tenantsList, setTenantsList] = useState([]);
  const [addAmount, setAddAmount] = useState("");
  const [addMethod, setAddMethod] = useState("Cash");
  const [addPaymentType, setAddPaymentType] = useState("partial");
  const [addReceipt, setAddReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [previewSrc, setPreviewSrc] = useState(null);
  const [toast, setToast] = useState(null);
  const [revenue, setRevenue] = useState({ total: 0, count: 0, breakdown: [] });
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportStart, setReportStart] = useState(null);
  const [reportEnd, setReportEnd] = useState(null);

  const token = localStorage.getItem("token");

  /** Load payments */
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

  useEffect(() => {
    loadPayments();
    // load current month revenue
    const m = new Date().getMonth() + 1;
    (async () => {
      try {
        const res = await API.get(`/payments/admin/revenue?month=${m}`);
        setRevenue(res.data || { total: 0, count: 0, breakdown: [] });
      } catch (err) {
        console.error('LOAD REVENUE ERROR:', err);
      }
    })();
  }, [loadPayments]);

  // derive filtered report from payments + report range
  const getRangeFor = (period, dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(d);
    const end = new Date(d);
    if (period === 'week') {
      // ISO week: start Monday
      const day = d.getDay();
      const diffToMonday = (day + 6) % 7; // 0->6,1->0,...
      start.setDate(d.getDate() - diffToMonday);
      end.setDate(start.getDate() + 6);
    } else if (period === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0); // last day of month
    } else if (period === 'year') {
      start.setMonth(0); start.setDate(1);
      end.setMonth(11); end.setDate(31);
    }
    // normalize time
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return { start, end };
  };

  const applyReportRange = () => {
    const { start, end } = getRangeFor(reportPeriod, reportDate);
    setReportStart(start);
    setReportEnd(end);
  };

  const filteredReportPayments = (() => {
    if (!reportStart || !reportEnd) return [];
    return payments.filter(p => {
      const t = new Date(p.created_at);
      return t >= reportStart && t <= reportEnd;
    });
  })();

  const exportToCSV = (rows) => {
    if (!rows || !rows.length) return showToast('No data to export', 'error');
    const headers = ['ID','Tenant','Room','Amount','Balance','Method','Type','Status','Receipt','Date'];
    const csv = [headers.join(',')].concat(rows.map(r => [
      r.id,
      '"' + (r.tenant_name || '') + '"',
      '"' + (r.room_number || '') + '"',
      Number(r.amount || 0),
      Number(r.balance || 0),
      r.method || '',
      r.payment_type || '',
      r.status || '',
      '"' + (r.receipt ? BACKEND_URL + r.receipt : '') + '"',
      new Date(r.created_at).toLocaleString()
    ].join(','))).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_report_${reportPeriod}_${reportDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const openAddModal = () => {
    setTenantIdInput("");
    setAddAmount("");
    setAddMethod("Cash");
    setAddPaymentType("partial");
    setAddReceipt(null);
    // load tenants for dropdown
    (async () => {
      try {
        const res = await API.get('/tenants/all');
        setTenantsList(res.data || []);
      } catch (err) {
        console.error('FETCH TENANTS ERROR:', err);
        showToast('Failed to load tenants', 'error');
      }
      setShowAddModal(true);
    })();
  };

  const handleAddPayment = async () => {
    if (!tenantIdInput) return showToast("Please enter tenant id", "error");
    if (!addAmount || Number(addAmount) <= 0) return showToast("Please enter a valid amount", "error");

    const formData = new FormData();
    formData.append("tenant_id", tenantIdInput);
    formData.append("amount", addAmount);
    formData.append("method", addMethod);
    formData.append("payment_type", addPaymentType);
    if (addReceipt) formData.append("receipt", addReceipt);

    try {
      await API.post("/payments/admin/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Payment added", "success");
      setShowAddModal(false);
      loadPayments();
    } catch (err) {
      console.error("ADD PAYMENT ERROR:", err?.response || err);
      showToast(err?.response?.data?.message || "Failed to add payment", "error");
    }
  };

  /** Toast helper */
  const showToast = (message, type = "info", ms = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  /** Approve payment */
  const approvePayment = async (id) => {
    if (!window.confirm("Approve this payment?")) return;
    try {
      const res = await API.patch(
        `/payments/admin/approve/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Payment approved", "success");
      setPayments(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, status: res.data.status, balance: res.data.balance }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to approve", "error");
    }
  };

  /** Reject payment */
  const rejectPayment = async (id) => {
    if (!window.confirm("Reject this payment?")) return;
    try {
      const res = await API.patch(
        `/payments/admin/reject/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Payment rejected", "success");
      setPayments(prev =>
        prev.map(p =>
          p.id === id ? { ...p, status: res.data.status } : p
        )
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to reject", "error");
    }
  };

  /** Filter + Search + Sort */
  const visiblePayments = useMemo(() => {
    let list = [...payments];
    if (filter !== "all") list = list.filter(p => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          String(p.id).includes(q) ||
          (p.tenant_name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );
    return list;
  }, [payments, filter, search, sort]);

  const badge = (status) => {
    const info = STATUS_BADGE[status] || { text: status, color: "#94a3b8" };
    return (
      <span
        style={{
          background: info.color,
          color: "#fff",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 12,
          textTransform: "capitalize",
        }}
      >
        {info.text}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <Link to="/admin/dashboard">
        <button style={buttonStyle}>Back</button>
      </Link>

      <h1>Admin — Payment Management</h1>

      <div style={styles.revenueCard}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Revenue (month)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>₱{Number(revenue.total || 0).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right', color: '#374151' }}>{revenue.count || 0} payments</div>
      </div>

      {/* Report controls */}
      <div style={styles.reportControls}>
        <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} style={styles.input}>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
        <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={styles.input} />
        <button onClick={applyReportRange} style={styles.primaryButton}>Apply</button>
        <button onClick={() => exportToCSV(filteredReportPayments)} style={styles.secondaryButton}>Export to Excel</button>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#374151' }}>
          {reportStart && reportEnd && (
            <>Showing {filteredReportPayments.length} payments from {reportStart.toLocaleDateString()} to {reportEnd.toLocaleDateString()}</>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>

        <input
          placeholder="Search tenant or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 200 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={openAddModal} style={styles.addButton}>+ Add Payment</button>
      </div>

      {/* Payments Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Tenant</th>
            <th style={thStyle}>Room</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Balance</th>
            <th style={thStyle}>Method</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Receipt</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="10" style={tdStyle}>Loading...</td></tr>
          ) : visiblePayments.length === 0 ? (
            <tr><td colSpan="10" style={tdStyle}>No payments found</td></tr>
          ) : (
            visiblePayments.map(p => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.id}</td>
                <td style={tdStyle}>{p.tenant_name}</td>
                <td style={tdStyle}>{p.room_number || "—"}</td>
                <td style={tdStyle}>₱{Number(p.amount).toLocaleString()}</td>
                <td style={tdStyle}>₱{Number(p.balance || 0).toLocaleString()}</td>
                <td style={tdStyle}>{p.method}</td>
                <td style={tdStyle}>{p.payment_type}</td>
                <td style={tdStyle}>
                  {p.receipt ? (
                    <button onClick={() => setPreviewSrc(`${BACKEND_URL}${p.receipt}`)} style={buttonStyle}>
                      View
                    </button>
                  ) : "None"}
                </td>
                <td style={tdStyle}>{badge(p.status)}</td>
                <td style={tdStyle}>
                  {p.status === "pending" ? (
                      <>
                        <button onClick={() => approvePayment(p.id)} style={buttonStyle}>
                          {p.payment_type === 'partial' ? 'Partial' : 'Approve'}
                        </button>{" "}
                        <button onClick={() => rejectPayment(p.id)} style={buttonStyle}>Reject</button>
                      </>
                    ) : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Receipt Preview */}
      {previewSrc && (
        <div style={modalOverlayStyle} onClick={() => setPreviewSrc(null)}>
          <img src={previewSrc} alt="receipt" style={modalContentStyle} />
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={{ ...modalContentStyle, maxWidth: 420, padding: 20, background: '#fff' }} onClick={e => e.stopPropagation()}>
            <h3>Add Payment (Admin)</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Tenant</label>
              {tenantsList.length === 0 ? (
                <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>No tenants loaded</div>
              ) : (
                <select value={tenantIdInput} onChange={e => setTenantIdInput(e.target.value)} style={inputStyle}>
                  <option value="">Select tenant...</option>
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>{t.id} — {t.full_name}</option>
                  ))}
                </select>
              )}

              <label>Amount</label>
              <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} style={inputStyle} />

              <label>Method</label>
              <select value={addMethod} onChange={e => setAddMethod(e.target.value)} style={inputStyle}>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
              </select>

              <label>Payment Type</label>
              <select value={addPaymentType} onChange={e => setAddPaymentType(e.target.value)} style={inputStyle}>
                <option value="full">Full</option>
                <option value="partial">Partial</option>
              </select>

              <label>Receipt (optional)</label>
              <input type="file" accept="image/*" onChange={e => setAddReceipt(e.target.files[0])} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowAddModal(false)} style={buttonStyle}>Cancel</button>
                <button onClick={handleAddPayment} style={buttonStyle}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#111", color: "#fff", padding: 10 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

/* Styles */
const thStyle = { padding: 10, background: "#f8fafc", textAlign: "left", border: '1px solid #e5e7eb' };
const tdStyle = { padding: 10, border: '1px solid #e5e7eb' };
const inputStyle = { padding: 6 };
const buttonStyle = { padding: "6px 10px", margin: 2 };
const modalOverlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" };
const modalContentStyle = { maxWidth: "80%", margin: "5% auto", display: "block" };

const styles = {
  container: { padding: 24, background: '#f3f4f6', minHeight: '100vh', fontFamily: 'Inter, system-ui, Arial' },
  revenueCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', padding: 16, background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  reportControls: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' },
  primaryButton: { padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  secondaryButton: { padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  addButton: { padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  table: { width: '100%', background: '#fff', borderCollapse: 'collapse', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' },
};

export default AdminPayments;
