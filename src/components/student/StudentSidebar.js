import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const StudentSidebar = ({ onClose, handleLogout }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('Academic Portal');

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
        <span className="material-symbols-rounded" data-icon="close">close</span>
      </button>
      <div className="p-4">
        <div className="d-flex align-items-center">
          <div className="me-3">
            <span className="material-symbols-rounded sidebar-header-icon" data-icon="school">school</span>
          </div>
          <div>
            <h5 className="mb-0" style={{ fontWeight: '700', color: 'white' }}>Student Panel</h5>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>{schoolName}</small>
          </div>
        </div>
      </div>
      <Nav className="flex-column px-3">
        <LinkContainer to="/student/dashboard" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="dashboard">dashboard</span>
            Dashboard
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/grades" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="grading">grading</span>
            My Grades
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/attendance" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="event_available">event_available</span>
            My Attendance
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/timetable" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="calendar_view_month">calendar_view_month</span>
            Timetable
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/materials" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="menu_book">menu_book</span>
            Study Materials
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/announcements" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="campaign">campaign</span>
            Announcements
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/results" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="analytics">analytics</span>
            Results
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/student/fee-chalan" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="request_quote">request_quote</span>
            Fee Chalan
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

export default StudentSidebar;
