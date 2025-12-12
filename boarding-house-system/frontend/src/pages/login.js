import React, { useState } from "react";
import API from "../api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("user_id", res.data.user.id);

      alert("Login Successful!");

      if (res.data.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/client/dashboard";
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapperStyle}>
      <form onSubmit={handleLogin} style={formStyle}>

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


  <h2 style={titleStyle}>Login</h2>


        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Please wait..." : "Login"}
        </button>

        {/* ✅ Added Register Redirect (ONLY ADDITION) */}
        <p style={{ textAlign: "center", marginTop: "10px" }}>
          Don't have an account?{" "}
          <a href="/register" style={{ color: "#2563eb", fontWeight: "bold" }}>
            Register here
          </a>
        </p>
      </form>
    </div>
  );
};

const wrapperStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f4f6",
  padding: "20px",
};

const formStyle = {
  width: "100%",
  maxWidth: "400px",
  background: "#ffffff",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const titleStyle = {
  textAlign: "center",
  color: "#1f2937",
  marginBottom: "10px",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  outline: "none",
  background: "#ffffff"
};

const buttonStyle = {
  background: "#374151",
  color: "white",
  padding: "12px",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "16px",
};

export default Login;