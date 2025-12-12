import React, { useState } from "react";
import API from "../api";

const CreateRoom = () => {
  const [form, setForm] = useState({
    room_number: "",
    type: "single",
    rate: "",
    capacity: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await API.post("/rooms/create", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message);
      setForm({ room_number: "", type: "single", rate: "", capacity: 1 });
    } catch (err) {
      alert(err.response?.data?.message || "Error creating room");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create Room</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Room Number"
          value={form.room_number}
          onChange={(e) => setForm({ ...form, room_number: e.target.value })}
          required
          style={styles.input}
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={styles.input}
        >
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="shared">Shared</option>
        </select>
        <input
          type="number"
          placeholder="Rate"
          value={form.rate}
          onChange={(e) => setForm({ ...form, rate: e.target.value })}
          required
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Capacity"
          value={form.capacity}
          min="1"
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Create Room</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    background: "#f3f4f6",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#1f2937",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
    width: "90%",
  },
  button: {
    background: "#1f2937",
    color: "white",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
};

export default CreateRoom;
