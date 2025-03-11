import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreatePoll from './pages/CreatePoll';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div className="gradient-bg min-vh-100">
      <Navbar />
      <Container fluid className="px-4 py-5">
        <Routes>
          {/* Make login the landing page */}
          <Route path="/" element={!isAuthenticated ? <Login /> : <Navigate to="/home" />} />
          <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/home" />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreatePoll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
