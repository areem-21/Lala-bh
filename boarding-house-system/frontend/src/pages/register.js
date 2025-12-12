import React, { useState } from "react";
import API from "../api";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "client"
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/register", form);
      alert(res.data.message);
      setForm({ name: "", email: "", password: "", role: "client" });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapperStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>

  {/* ✅ HOME ICON BACK BUTTON */}
  <button
    type="button"
    onClick={() => (window.location.href = "/home")}
    style={{
      background: "transparent",
      border: "none",
      cursor: "pointer",
      width: "40px",
      marginBottom: "10px",
    }}
    title="Go to Home"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="#374151"
      width="35px"
      height="35px"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  </button>

  <h2 style={titleStyle}>Register</h2>


        <input
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
          required
        />

        <input
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={inputStyle}
          required
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          style={selectStyle}
        >
          <option value="client">Client</option>
          <option value="admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Please wait..." : "Register"}
          </button>
           {/* ✅ ADDED LOGIN REDIRECT (ONLY ADDITION) */}
        <p style={{ textAlign: "center", marginTop: "10px" }}>
          Already have an account?{" "}
          <a href="/" style={{ color: "#2563eb", fontWeight: "bold" }}>
            Login here
          </a>
        </p>
      </form>
    </div>
  );
};

// Styles
const wrapperStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f4f6", // light gray
  padding: "20px",
};

const formStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "#ffffff", // white form
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const titleStyle = {
  textAlign: "center",
  color: "#1f2937", // dark gray
  marginBottom: "10px",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db", // gray border
  fontSize: "15px",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  background: "#ffffff",
};

const buttonStyle = {
  background: "#374151", // dark gray button
  color: "white",
  padding: "12px",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "16px",
};

export default Register;
