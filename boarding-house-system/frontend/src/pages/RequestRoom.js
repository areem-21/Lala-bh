import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const RequestRoom = () => {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "male",
    address: "",
    emergency_contact: "",
    room_id: "",
  });

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get("/rooms/list", {
          headers: { Authorization: `Bearer ${token}` },
        });

       
        setRooms(res.data);
      } catch (err) {
        console.error(err);
        alert("Error fetching rooms");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await API.post("/tenants/request-room", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message);

      setForm({
        full_name: "",
        email: "",
        phone: "",
        gender: "male",
        address: "",
        emergency_contact: "",
        room_id: "",
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error submitting request");
    }
  };

  return (
    <div style={styles.page}>
      
      {/* ✅ BACK BUTTON LEFT SIDE */}
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        ⬅ Back
      </button>

      <div style={styles.container}>
        <h2 style={styles.title}>Request a Room</h2>

        {loading ? (
          <p style={styles.loading}>Loading rooms...</p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>

            <input
              type="text"
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              style={styles.input}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={styles.input}
              required
            />

            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              style={styles.select}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Emergency Contact"
              value={form.emergency_contact}
              onChange={(e) =>
                setForm({ ...form, emergency_contact: e.target.value })
              }
              style={styles.input}
              required
            />

           <select
  value={form.room_id}
  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
  style={styles.select}
>
  <option value="">Select Room</option>
  {rooms.map((room) => (
    <option key={room.id} value={room.id} disabled={room.availability === "Full"}>
      {room.room_number} - {room.type} - ₱{room.rate} ({room.availability})
    </option>
  ))}
</select>



            <button type="submit" style={styles.button}>Request Room</button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    background: "#f5f5f5",
    minHeight: "100vh",
    padding: "40px 20px",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: "20px",
    top: "20px",
    padding: "8px 14px",
    fontSize: "14px",
    background: "#ccc",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  container: {
    maxWidth: "600px",
    margin: "auto",
    padding: "30px",
    background: "white",
    borderRadius: "10px",
    border: "1px solid #ddd",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  title: {
    textAlign: "center",
    color: "#555",
    marginBottom: "20px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#fafafa",
    fontSize: "15px",
  },
  select: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#fafafa",
    fontSize: "15px",
  },
  button: {
    padding: "12px",
    background: "#555",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  loading: {
    textAlign: "center",
    fontSize: "16px",
  },
};

export default RequestRoom;
