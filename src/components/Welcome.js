import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Welcome = () => {
  const [schoolName, setSchoolName] = useState('School Portal');

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

  return (
    <div className="welcome-container">
      <Container className="px-3 px-md-5" style={{ position: 'relative', zIndex: 1 }}>
        <Row className="justify-content-center align-items-center" style={{ minHeight: '90vh' }}>
          <Col xs={12} sm={10} md={10} lg={8}>
            <Card className="text-center welcome-card">
              <Card.Header className="welcome-header text-white">
                <h1>Welcome to {schoolName}</h1>
                <p className="mb-0 mt-2" style={{ fontSize: '1.1rem', opacity: 0.95 }}>
                  Empowering Education Excellence
                </p>
              </Card.Header>
              <Card.Body className="p-4 p-md-5">
                <p className="lead mb-4" style={{ color: 'var(--color-muted)', fontWeight: 500 }}>
                  A comprehensive school management system for administrators, teachers, parents, and students.
                </p>
                
                <Row className="mt-5">
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-crown"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Admin</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Manage users, classes, and school operations
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-chalkboard-teacher"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Teacher</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Mark attendance, upload grades, and communicate
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-users"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Parent</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Monitor child's progress and communicate with teachers
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-user-graduate"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Student</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        View grades, attendance, and study materials
                      </p>
                    </div>
                  </Col>
                </Row>

                <Row className="mt-4">
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-bus"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Transport</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Manage vehicles, drivers, routes and student assignments
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-book"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Library</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Catalog books, issue and return records for students
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-calculator"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Accounts</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Track transactions and create invoices for students
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-hotel"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Hostel</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Manage rooms, resident allocations and hostel payments
                      </p>
                    </div>
                  </Col>
                  <Col xs={12} sm={6} md={6} lg={3} className="mb-4 mb-lg-0">
                    <div className="role-card shadow-sm">
                      <i className="fas fa-hotel"></i>
                      <h4 style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cafeteria</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        Manage meals, orders and payments
                      </p>
                    </div>
                  </Col>
                </Row>
                
                <div className="mt-5 pt-3">
                  <Button className="btn-get-started text-white" as={Link} to="/login">
                    <i className="fas fa-rocket me-2"></i>
                    Get Started
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Welcome;
