// frontend/src/pages/TenantPayment.js
import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const TenantPayment = () => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [receipt, setReceipt] = useState(null);
  const [paymentType, setPaymentType] = useState("full");
  const [tenantInfo, setTenantInfo] = useState({
    remaining_balance: 0,
    room_rate: 0,
    room_number: null,
  });
  const [payments, setPayments] = useState([]);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const goBack = () => navigate("/client/dashboard");

  // ✅ Fetch tenant info + payments
  const fetchPayments = useCallback(async () => {
    try {
      const res = await API.get("/payments/my-payments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data.success) {
        alert(res.data.message || "Failed to load payments");
        return;
      }

      setTenantInfo(res.data.tenant || {});
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error("FETCH PAYMENTS ERROR:", err);
      alert("Failed to load payments");
    }
  }, [token]);

  // ✅ Submit payment
  const handlePayment = async () => {
    if (!amount) return alert("Please enter amount");

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("method", method);
    formData.append("payment_type", paymentType);

    if (method === "GCash") {
      if (!receipt) return alert("Please upload receipt");
      formData.append("receipt", receipt);
    }

    try {
      const res = await API.post("/payments/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data.success) {
        alert(res.data.message || "Payment failed");
        return;
      }

      alert("Payment submitted for admin approval");
      setAmount("");
      setReceipt(null);
      setMethod("Cash");
      setPaymentType("full");
      fetchPayments();
    } catch (err) {
      console.error("PAYMENT ERROR:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Payment failed");
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <button onClick={goBack} style={styles.backButton}>Back</button>
        <h1 style={styles.title}>Tenant Payment</h1>
      </div>
{/* ✅ Summary */}
<div style={styles.summaryCard}>
  <div><strong>Room:</strong> {tenantInfo.room_number || "—"}</div>
  <div><strong>Room Type:</strong> {tenantInfo.room_type || "—"}</div>
  <div><strong>Room Rate:</strong> ₱{Number(tenantInfo.room_rate || 0).toLocaleString()}</div>
  <div><strong>Balance:</strong> ₱{Number(tenantInfo.balance || 0).toLocaleString()}</div>
</div>


      
      {/* Payment Form */}
      <div style={styles.centerWrapper}>
        
        <div style={styles.card}>

          <label>Payment Type:</label>
          <select
            value={paymentType}
            onChange={e => setPaymentType(e.target.value)}
            style={styles.select}
          >
            <option value="full">Full payemnt</option>
            <option value="partial">Partial payemnt</option>
          </select>
          <label>Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={styles.input}
          />

          <label>Payment Method:</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={styles.select}
          >
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
          </select>

          {method === "GCash" && (
            <>
              <label>Upload Receipt:</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setReceipt(e.target.files[0])}
                style={styles.input}
              />
            </>
          )}

          <button onClick={handlePayment} style={styles.button}>
            Submit Payment
          </button>
        </div>
      </div>

      {/* Payment History */}
      <h2 style={{ marginTop: 30 }}>My Payment History</h2>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Method</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Receipt</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 12 }}>No payments yet.</td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id || p.created_at}>
                  <td style={styles.td}>₱{Number(p.amount).toLocaleString()}</td>
                  <td style={styles.td}>{p.method}</td>
                  <td style={styles.td}>{p.payment_type}</td>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>
                    {p.status === "pending" ? "Pending" : p.status === "paid" ? "Paid ✔" : p.status}
                  </td>
                  <td style={styles.td}>
                    {p.receipt ? (
                      <a
                        href={`http://localhost:5000${p.receipt}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : "None"}
                  </td>
                  <td style={styles.td}>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* Styles */
const styles = {
  container: { padding: 20, background: "#f3f4f6", minHeight: "100vh" },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { padding: "10px 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  title: { color: "#1f2937", margin: 4, flexGrow: 1 },
  summaryCard: { background: "#fff", padding: 16, borderRadius: 8, marginBottom: 16 },
  centerWrapper: { display: "flex", justifyContent: "center" },
  card: { background: "#fff", padding: 20, borderRadius: 12, maxWidth: 500, width: "100%" },
  input: { padding: 10, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, width: "100%" },
  select: { padding: 10, borderRadius: 8, border: "1px solid #d1d5db", width: "100%" },
  button: { padding: 12, background: "#4b5563", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", marginTop: 8 },
  tableWrapper: { overflowX: "auto", marginTop: 10 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, border: '1px solid #e5e7eb' },
  th: { padding: 12, border: '1px solid #e5e7eb', background: '#f8fafc', textAlign: 'left' },
  td: { padding: 12, border: '1px solid #e5e7eb' },
};

export default TenantPayment;
