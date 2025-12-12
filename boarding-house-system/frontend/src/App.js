import './App.css';
import { Routes, Route } from "react-router-dom";

// Import your pages (create them later)
import Home from "./pages/Home";
import Login from "./pages/login";
import Register from "./pages/register";
import AdminDashboard from "./pages/AdminDashboard";
import CreateRoom from "./pages/CreateRoom";
import RoomsList from "./pages/RoomsList";
import ClientDashboard from "./pages/ClientDashboard";
import RequestRoom from "./pages/RequestRoom";
import MyRequest from "./pages/MyRequest";
import TenantList from "./pages/TenantList";
import TenantPayment from "./pages/TenantPayment";
import AdminPayments from "./pages/AdminPayments";


function App() {
  return (
    <div className="App">
      
<Routes>
  <Route path="/home" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
  <Route path="/admin/create-room" element={<CreateRoom />} />
  <Route path="/rooms" element={<RoomsList />} />
  <Route path="/tenants" element={<TenantList />} />
  <Route path="/client/dashboard" element={<ClientDashboard />} />
   <Route path="/client/request-room" element={<RequestRoom />} />
   <Route path="/client/my-request" element={<MyRequest />} />
   <Route path="/client/payments" element={<TenantPayment />} />
   <Route path="/admin/payments" element={<AdminPayments />} />
</Routes>

    </div>
  );
}

export default App;
