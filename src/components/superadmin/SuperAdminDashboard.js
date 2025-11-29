import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import SuperAdminSidebar from './SuperAdminSidebar';
import AdminUserManagement from '../admin/UserManagement';

const SuperAdminOverview = () => {
  const [counts, setCounts] = useState({
    total: 0,
    superadmin: 0,
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0,
    transport: 0,
    library: 0,
    accounts: 0,
    hostel: 0,
    cafeteria: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const roleCounts = {
          total: 0,
          superadmin: 0,
          admin: 0,
          teacher: 0,
          student: 0,
          parent: 0,
          transport: 0,
          library: 0,
          accounts: 0,
          hostel: 0,
          cafeteria: 0
        };
        usersSnap.forEach(docSnap => {
          const data = docSnap.data() || {};
          const role = (data.role || '').toLowerCase();
          roleCounts.total += 1;
          if (roleCounts.hasOwnProperty(role)) {
            roleCounts[role] += 1;
          }
        });
        setCounts(roleCounts);
      } catch (e) {
        // Fail silently to avoid impacting rest of UI
        setCounts(prev => ({ ...prev }));
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const StatCard = ({ title, value, iconClass, gradient }) => (
    <Card className="text-center h-100 text-white" style={{ background: gradient, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
      <Card.Body>
        <Card.Title className="mb-2">
          <i className={`${iconClass} fa-2x`}></i>
        </Card.Title>
        <Card.Text>
          <h3 className="mb-1">{loading ? '—' : value}</h3>
          <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</p>
        </Card.Text>
      </Card.Body>
    </Card>
  );

  return (
    <div className="container-enhanced">
      <Row className="mb-4">
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Total Users"
            value={counts.total}
            iconClass="fas fa-users"
            gradient="linear-gradient(120deg, #1a73e8 0%, #1557b0 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Super Admins"
            value={counts.superadmin}
            iconClass="fas fa-crown"
            gradient="linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Admins"
            value={counts.admin}
            iconClass="fas fa-user-shield"
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Teachers"
            value={counts.teacher}
            iconClass="fas fa-chalkboard-teacher"
            gradient="linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)"
          />
        </Col>
      </Row>
      <Row className="mb-4">
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Students"
            value={counts.student}
            iconClass="fas fa-user-graduate"
            gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Parents"
            value={counts.parent}
            iconClass="fas fa-user-friends"
            gradient="linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Transport"
            value={counts.transport}
            iconClass="fas fa-bus"
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Library"
            value={counts.library}
            iconClass="fas fa-book"
            gradient="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
          />
        </Col>
      </Row>
      <Row className="mb-4">
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Accounts"
            value={counts.accounts}
            iconClass="fas fa-calculator"
            gradient="linear-gradient(135deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Hostel"
            value={counts.hostel}
            iconClass="fas fa-hotel"
            gradient="linear-gradient(135deg, #f5576c 0%, #f093fb 100%)"
          />
        </Col>
        <Col xs={6} sm={6} md={3} className="mb-3">
          <StatCard
            title="Cafeteria"
            value={counts.cafeteria}
            iconClass="fas fa-coffee"
            gradient="linear-gradient(135deg, #fbc2eb 0%, #a18cd1 100%)"
          />
        </Col>
      </Row>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('School Portal');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    const sidebar = document.querySelector('.sidebar-enhanced');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    const sidebar = document.querySelector('.sidebar-enhanced');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="d-flex min-vh-100">
      <div className="sidebar-overlay" onClick={closeSidebar}></div>
      <SuperAdminSidebar handleLogout={handleLogout} />
      <div className="flex-grow-1 d-flex flex-column">
        <Navbar expand="lg" className="navbar-enhanced">
          <Container fluid className="d-flex align-items-center">
            <Navbar.Toggle 
              aria-controls="basic-navbar-nav" 
              variant="primary" 
              onClick={toggleSidebar}
              title="Open Menu"
            />
            <i className="fas fa-bars"></i>
            <Navbar.Brand className="d-flex align-items-center flex-grow-1">
              <i className="fas fa-crown me-2" style={{ color: 'var(--secondary-color)' }}></i>
              <span className="d-none d-sm-inline">{schoolName} - Super Admin</span>
              <span className="d-sm-none">Super Admin</span>
            </Navbar.Brand>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ms-auto d-flex align-items-center flex-wrap">
                <div className="d-flex align-items-center me-3 d-none d-sm-flex">
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                    <i className="fas fa-user text-white"></i>
                  </div>
                  <span className="text-muted d-none d-md-inline">Welcome, {currentUser?.displayName}</span>
                </div>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
        <div className="flex-grow-1 container-enhanced">
          <Routes>
            <Route path="/dashboard" element={<SuperAdminOverview />} />
            <Route path="/users" element={<AdminUserManagement includeAdminRoles />} />
            <Route path="/" element={<SuperAdminOverview />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;


