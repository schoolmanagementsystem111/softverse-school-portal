import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Auth from './components/Auth';
import Welcome from './components/Welcome';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import ParentDashboard from './components/parent/ParentDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import TransportDashboard from './components/transport/TransportDashboard';
import LibraryDashboard from './components/library/LibraryDashboard';
import AccountsDashboard from './components/accounts/AccountsDashboard';
import HostelDashboard from './components/hostel/HostelDashboard';
import CafeteriaDashboard from './components/cafeteria/CafeteriaDashboard';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Auth />} />
            <Route 
              path="/super-admin/*" 
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher/*" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/parent/*" 
              element={
                <ProtectedRoute requiredRole="parent">
                  <ParentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/*" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transport/*" 
              element={
                <ProtectedRoute requiredRole="transport">
                  <TransportDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/library/*" 
              element={
                <ProtectedRoute requiredRole="library">
                  <LibraryDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/accounts/*" 
              element={
                <ProtectedRoute requiredRole="accounts">
                  <AccountsDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hostel/*" 
              element={
                <ProtectedRoute requiredRole="hostel">
                  <HostelDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cafeteria/*" 
              element={
                <ProtectedRoute requiredRole="cafeteria">
                  <CafeteriaDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
