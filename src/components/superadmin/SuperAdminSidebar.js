import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const SuperAdminSidebar = ({ onClose, handleLogout }) => {
  const { logout, currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('School Management');

  useEffect(() => {
    const fetchSchoolProfile = async () => {
      try {
        const profileRef = doc(db, 'schoolProfile', 'main');
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.schoolName) {
            setSchoolName(data.schoolName);
          }
        }
      } catch (error) {
        console.error('Error fetching school profile:', error);
      }
    };

    fetchSchoolProfile();
  }, []);

  const handleCloseSidebar = () => {
    const sidebar = document.querySelector('.sidebar-enhanced');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
    if (onClose) onClose();
  };

  const handleLogoutClick = async () => {
    if (handleLogout) {
      await handleLogout();
    } else {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Failed to log out', error);
      }
    }
    handleCloseSidebar();
  };

  return (
    <div className="sidebar-enhanced" style={{ width: '280px', minHeight: '100vh', position: 'relative' }}>
      <button className="sidebar-close-btn" onClick={handleCloseSidebar}>
        <i className="fas fa-times"></i>
      </button>
      <div className="p-4 sidebar-header">
        <div className="d-flex flex-column">
          <h5 className="mb-1" style={{ fontWeight: '800', color: 'white' }}>{currentUser?.displayName || schoolName}</h5>
          <small className="mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{currentUser?.email || ''}</small>
          {userRole && (
            <span className="sidebar-badge">{String(userRole).toUpperCase()}</span>
          )}
        </div>
      </div>
      <Nav className="flex-column px-3">
        <LinkContainer to="/super-admin/dashboard" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="dashboard">dashboard</span>
            Dashboard
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/super-admin/users" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="supervisor_account">supervisor_account</span>
            User Management
          </Nav.Link>
        </LinkContainer>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '10px', paddingTop: '10px' }}>
          <Nav.Link className="text-white sidebar-item" onClick={handleLogoutClick} style={{ cursor: 'pointer' }}>
            <span className="material-symbols-rounded me-2" data-icon="logout">logout</span>
            Logout
          </Nav.Link>
        </div>
      </Nav>
    </div>
  );
};

export default SuperAdminSidebar;


