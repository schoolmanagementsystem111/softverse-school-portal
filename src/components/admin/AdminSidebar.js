import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminSidebar = ({ onClose, handleLogout }) => {
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
    <div className="sidebar-enhanced" style={{ minHeight: '100vh' }}>
      <button className="sidebar-close-btn" onClick={handleCloseSidebar}>
        <i className="fas fa-times"></i>
      </button>
      <div className="p-4 sidebar-header">
        <div className="d-flex align-items-center">
          <span className="material-symbols-rounded sidebar-header-icon me-3" data-icon="supervisor_account">supervisor_account</span>
          <div className="d-flex flex-column">
            <h5 className="mb-1" style={{ fontWeight: '800', color: 'white' }}>{currentUser?.displayName || schoolName}</h5>
            <small className="mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{currentUser?.email || ''}</small>
            {userRole && (
              <span className="sidebar-badge">{String(userRole).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
      <Nav className="flex-column px-3">
        <LinkContainer to="/admin/dashboard" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="dashboard">dashboard</span>
            Dashboard
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/transport" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="directions_bus">directions_bus</span>
            Transport
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/users" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="group">group</span>
            User Management
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/student-biodata" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="badge">badge</span>
            Student Biodata
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/student-contact-list" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="contact_page">contact_page</span>
            Student Contact List
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/sibling-management" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="groups">groups</span>
            Sibling Information
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/admission-inquiries" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="person_add">person_add</span>
            Admission Inquiries
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/classes" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="co_present">co_present</span>
            Class Management
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/attendance" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="event_available">event_available</span>
            Attendance Reports
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/whatsapp" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="chat">chat</span>
            WhatsApp Messaging
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/timetable" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="calendar_view_month">calendar_view_month</span>
            Timetable
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/teacher-attendance" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="badge">badge</span>
            Teacher Attendance
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/teacher-qr-cards" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="qr_code_2">qr_code_2</span>
            Teacher QR Cards
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/announcements" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="campaign">campaign</span>
            Announcements
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/character-certificate" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="workspace_premium">workspace_premium</span>
            Character Certificate
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/school-leaving-certificate" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="school">school</span>
            School Leaving Certificate
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/results" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="analytics">analytics</span>
            Results
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/school-profile" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="domain">domain</span>
            School Profile
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/fee-chalan" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="request_quote">request_quote</span>
            Fee Chalan
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/fee-defaulters" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="warning">warning</span>
            Fee Defaulters
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/ledger" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="book">book</span>
            Ledger
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/library" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="menu_book">menu_book</span>
            Library
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/cafeteria" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="restaurant">restaurant</span>
            Cafeteria
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/accounts" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="calculate">calculate</span>
            Accounts
          </Nav.Link>
        </LinkContainer>
        <LinkContainer to="/admin/hostel" onClick={handleCloseSidebar}>
          <Nav.Link className="text-white sidebar-item">
            <span className="material-symbols-rounded me-2" data-icon="hotel">hotel</span>
            Hostel
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

export default AdminSidebar;
