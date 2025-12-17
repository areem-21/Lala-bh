import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";

const RoomsList = () => {
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [newRoom, setNewRoom] = useState({
    room_number: "",
    type: "",
    rate: "",
    capacity: "",
  });

  const [assign, setAssign] = useState({
    tenant_id: "",
    room_id: "",
  });

  useEffect(() => {
    fetchRooms();
    fetchTenants();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/rooms/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error fetching rooms");
    }
  };

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/tenants/list-basic", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenants(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching tenants");
    }
  };

  const handleAddRoom = async () => {
    const token = localStorage.getItem("token");

    if (!newRoom.room_number || !newRoom.type || !newRoom.rate || !newRoom.capacity) {
      return alert("Please fill up all fields");
    }

    try {
      await API.post("/rooms/add", newRoom, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Room added!");
      setNewRoom({ room_number: "", type: "", rate: "", capacity: "" });
      fetchRooms();
    } catch (err) {
      console.log(err);
      alert("Failed to add room.");
    }
  };

  const handleAssignRoom = async () => {
    const token = localStorage.getItem("token");

    if (!assign.tenant_id || !assign.room_id) {
      return alert("Please select tenant and room");
    }

    try {
      await API.post("/rooms/assign", assign, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Tenant assigned!");
      setAssign({ tenant_id: "", room_id: "" });
      fetchRooms();
    } catch (err) {
      console.log(err);
      alert("Failed to assign tenant.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "15px" }}>
        <Link to="/admin/dashboard">
          <button style={styles.backBtn}>Back</button>
        </Link>
      </div>

      <h2 style={styles.title}>Rooms Management</h2>

      {/* ADD ROOM FORM */}
      <div style={styles.card}>
        <h3>Add Room</h3>
        <input
          placeholder="Room Number"
          value={newRoom.room_number}
          onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
          style={styles.input}
        />
        <input
          placeholder="Type (e.g., Bedspace)"
          value={newRoom.type}
          onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
          style={styles.input}
        />
        <input
          placeholder="Rate"
          type="number"
          value={newRoom.rate}
          onChange={(e) => setNewRoom({ ...newRoom, rate: e.target.value })}
          style={styles.input}
        />
        <input
          placeholder="Capacity"
          type="number"
          value={newRoom.capacity}
          onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
          style={styles.input}
        />
        <button style={styles.btn} onClick={handleAddRoom}>Add Room</button>
      </div>

    

      {/* ROOMS TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Room</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Capacity</th>
              <th style={styles.th}>Occupied</th>
              <th style={styles.th}>Available</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const available = room.capacity - room.occupied_count;
              return (
                <tr key={room.id}>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>{room.room_number}</td>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>{room.type}</td>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>₱{room.rate}</td>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>{room.capacity}</td>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>{room.occupied_count}</td>
                  <td
                    style={{
                      ...styles.td,
                      border: '1px solid #e5e7eb',
                      fontWeight: "bold",
                      color: available <= 0 ? "red" : "green",
                    }}
                  >
                    {available}
                  </td>
                  <td style={{...styles.td, border: '1px solid #e5e7eb'}}>{available <= 0 ? "Full" : "Available"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* Styles */
const styles = {
  container: { padding: "20px", background: "#f3f4f6", minHeight: "100vh" },
  backBtn: {
    background: "#374151",
    color: "white",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
  title: { color: "#1f2937", marginBottom: "20px" },
  card: {
    background: "white",
    padding: "20px",
    marginBottom: "20px",
    borderRadius: "10px",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
    maxWidth: "400px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    marginBottom: "10px",
  },
  btn: {
    background: "#4b5563",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "90%",
  },
  tableWrapper: { marginTop: "20px", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", background: "white" },
  theadRow: { background: "#4b5563", color: "white" },
  th: { padding: "10px", border: "1px solid #e5e7eb" },
  td: { padding: "10px", border: "1px solid #e5e7eb" },
};

export default RoomsList;
