import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import MyProfile from './pages/MyProfile';
import ProtectedRoute from './components/ProtectedRoute';
import Settings from './pages/Settings';
import NewOrder from './pages/NewOrder';
import Leads from './pages/Leads';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import OrderDetails from './pages/OrderDetails';




function App() {
  return (
    <div className="gradient-bg min-h-screen">
      <Router>
        <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
        <Routes>
          <Route path="/login" element={<Login />} />


          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/my-profile" replace />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="new-order" element={<NewOrder />} />
            <Route path="leads" element={<Leads />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="crm" element={<CRM />} />
            <Route path="order-details" element={<OrderDetails />} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;