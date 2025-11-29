import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ParentSidebar = ({ onClose, handleLogout }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('Child Monitoring');

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
      <div className="p-4">
        <div className="d-flex align-items-center">
          <div className="me-3">
            <span className="material-symbols-rounded sidebar-header-icon" data-icon="groups">groups</span>
          </div>
          <div>
            <h5 className="mb-0" style={{ fontWeight: '700', color: 'white' }}>Parent Panel</h5>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>{schoolName}</small>
          </div>
        </div>
      </div>
      <Nav className="flex-column px-3">
        <LinkContainer to="/parent/dashboard" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="dashboard">dashboard</span>
            Dashboard
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/progress" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="show_chart">show_chart</span>
            Child Progress
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/attendance" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="event_available">event_available</span>
            Attendance
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/timetable" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="calendar_view_month">calendar_view_month</span>
            Timetable
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/messages" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="mail">mail</span>
            Messages
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/announcements" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="campaign">campaign</span>
            Announcements
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/results" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="analytics">analytics</span>
            Results
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/parent/fee-chalan" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white">
            <span className="material-symbols-rounded me-2" data-icon="request_quote">request_quote</span>
            Fee Chalan
          </Nav.Link>
        </LinkContainer>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '10px', paddingTop: '10px' }}>
          <Nav.Link className="text-white" onClick={handleLogoutClick} style={{ cursor: 'pointer' }}>
            <span className="material-symbols-rounded me-2" data-icon="logout">logout</span>
            Logout
          </Nav.Link>
        </div>
      </Nav>
    </div>
  );
};

export default ParentSidebar;
