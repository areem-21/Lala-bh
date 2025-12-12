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

  const fetchPayments = useCallback(async () => {
    try {
      const res = await API.get("/payments/my-payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // backend returns { tenant: {...}, payments: [...] }
      setTenantInfo(res.data.tenant || {});
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load payments");
    }
  }, [token]);

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
      await API.post("/payments/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Payment submitted for admin approval");
      setAmount("");
      setReceipt(null);
      setMethod("Cash");
      setPaymentType("full");
      fetchPayments();
    } catch (err) {
      console.error(err?.response?.data || err);
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

      <div style={styles.summaryCard}>
        <div><strong>Room:</strong> {tenantInfo.room_number || "—"}</div>
        <div><strong>Room Rate:</strong> ₱{Number(tenantInfo.room_rate || 0).toLocaleString()}</div>
        <div><strong>Remaining Balance:</strong> ₱{Number(tenantInfo.remaining_balance || tenantInfo.room_rate || 0).toLocaleString()}</div>
      </div>

      <div style={styles.centerWrapper}>
        <div style={styles.card}>
          <label>Amount:</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={styles.input} />

          <label>Payment Method:</label>
          <select value={method} onChange={e => setMethod(e.target.value)} style={styles.select}>
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
          </select>

          <label>Payment Type:</label>
          <select value={paymentType} onChange={e => setPaymentType(e.target.value)} style={styles.select}>
            <option value="full">Full Payment</option>
            <option value="partial">Partial Payment</option>
          </select>

          {method === "GCash" && (
            <>
              <label>Upload Receipt:</label>
              <input type="file" accept="image/*" onChange={e => setReceipt(e.target.files[0])} style={styles.input} />
            </>
          )}

          <button onClick={handlePayment} style={styles.button}>Submit Payment</button>
        </div>
      </div>

      <h2 style={{ marginTop: 30 }}>My Payment History</h2>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Method</th>
              <th>Type</th>
              <th>Status</th>
              <th>Receipt</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id || p.created_at}>
                <td>₱{Number(p.amount).toLocaleString()}</td>
                <td>{p.method}</td>
                <td style={{ textTransform: "capitalize" }}>{p.payment_type}</td>
                <td style={{ fontWeight: "bold" }}>
                  {p.status === "pending" ? "Pending" : p.status === "partial" ? "Partial" : p.status === "paid" ? "Paid ✔" : p.status}
                </td>
                <td>{p.receipt ? <a href={`http://localhost:5000${p.receipt}`} target="_blank" rel="noreferrer">View</a> : "None"}</td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* styles (same as you used earlier) */
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
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 },
};

export default TenantPayment;
