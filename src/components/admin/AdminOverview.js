import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminOverview = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0,
    attendanceToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const usersRef = collection(db, 'users');
      const studentsQuery = query(usersRef, where('role', '==', 'student'));
      const teachersQuery = query(usersRef, where('role', '==', 'teacher'));
      const parentsQuery = query(usersRef, where('role', '==', 'parent'));

      const [studentsSnapshot, teachersSnapshot, parentsSnapshot] = await Promise.all([
        getDocs(studentsQuery),
        getDocs(teachersQuery),
        getDocs(parentsQuery)
      ]);

      const classesRef = collection(db, 'classes');
      const classesSnapshot = await getDocs(classesRef);

      const attendanceRef = collection(db, 'attendance');
      const attendanceSnapshot = await getDocs(attendanceRef);

      setStats({
        totalStudents: studentsSnapshot.size,
        totalTeachers: teachersSnapshot.size,
        totalParents: parentsSnapshot.size,
        totalClasses: classesSnapshot.size,
        attendanceToday: attendanceSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center animate-fadeInUp">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="text-muted">Loading dashboard data...</h5>
        </div>
      </div>
    );
  }

  const accentPalette = {
    students: {
      background: 'linear-gradient(128deg, #1e3a8a 0%, #2563eb 100%)',
      shadow: '0 18px 42px rgba(37, 99, 235, 0.35)',
      iconBackground: 'rgba(255, 255, 255, 0.16)',
      badgeBackground: 'rgba(255, 255, 255, 0.22)',
      badgeColor: '#ffffff'
    },
    teachers: {
      background: 'linear-gradient(128deg, #8b5cf6 0%, #a855f7 100%)',
      shadow: '0 18px 42px rgba(168, 85, 247, 0.35)',
      iconBackground: 'rgba(255, 255, 255, 0.16)',
      badgeBackground: 'rgba(255, 255, 255, 0.22)',
      badgeColor: '#ffffff'
    },
    parents: {
      background: 'linear-gradient(128deg, #06b6d4 0%, #0ea5e9 100%)',
      shadow: '0 18px 42px rgba(14, 165, 233, 0.35)',
      iconBackground: 'rgba(255, 255, 255, 0.16)',
      badgeBackground: 'rgba(255, 255, 255, 0.22)',
      badgeColor: '#ffffff'
    },
    classes: {
      background: 'linear-gradient(128deg, #16a34a 0%, #22c55e 100%)',
      shadow: '0 18px 42px rgba(34, 197, 94, 0.35)',
      iconBackground: 'rgba(255, 255, 255, 0.16)',
      badgeBackground: 'rgba(255, 255, 255, 0.22)',
      badgeColor: '#ffffff'
    }
  };

  const statCards = [
    {
      key: 'students',
      value: stats.totalStudents,
      title: 'Total Students',
      icon: 'fas fa-user-graduate',
      badgeIcon: 'fas fa-arrow-up',
      badgeLabel: 'Active',
      accent: 'students'
    },
    {
      key: 'teachers',
      value: stats.totalTeachers,
      title: 'Total Teachers',
      icon: 'fas fa-chalkboard-teacher',
      badgeIcon: 'fas fa-users',
      badgeLabel: 'Faculty',
      accent: 'teachers'
    },
    {
      key: 'parents',
      value: stats.totalParents,
      title: 'Total Parents',
      icon: 'fas fa-users',
      badgeIcon: 'fas fa-heart',
      badgeLabel: 'Connected',
      accent: 'parents'
    },
    {
      key: 'classes',
      value: stats.totalClasses,
      title: 'Total Classes',
      icon: 'fas fa-school',
      badgeIcon: 'fas fa-graduation-cap',
      badgeLabel: 'Active',
      accent: 'classes'
    }
  ];

  const quickActions = [
    {
      key: 'student',
      label: 'Add New Student',
      icon: 'fas fa-user-plus',
      styles: {
        color: '#ffffff',
        background: 'linear-gradient(120deg, #1e3a8a 0%, #2563eb 100%)',
        border: 'none',
        boxShadow: '0 12px 28px rgba(37, 99, 235, 0.35)'
      },
      onClick: () => navigate('/admin/users#add-student')
    },
    {
      key: 'teacher',
      label: 'Add New Teacher',
      icon: 'fas fa-chalkboard-teacher',
      styles: {
        color: '#ffffff',
        background: 'linear-gradient(120deg, #166534 0%, #22c55e 100%)',
        border: 'none',
        boxShadow: '0 12px 28px rgba(34, 197, 94, 0.35)'
      },
      onClick: () => navigate('/admin/users#add-teacher')
    },
    {
      key: 'class',
      label: 'Create Class',
      icon: 'fas fa-school',
      styles: {
        color: '#ffffff',
        background: 'linear-gradient(120deg, #0ea5e9 0%, #06b6d4 100%)',
        border: 'none',
        boxShadow: '0 12px 28px rgba(14, 165, 233, 0.35)'
      },
      onClick: () => navigate('/admin/classes#new-class')
    },
    {
      key: 'announce',
      label: 'Send Announcement',
      icon: 'fas fa-bullhorn',
      styles: {
        color: '#ffffff',
        background: 'linear-gradient(120deg, #f59e0b 0%, #fb923c 100%)',
        border: 'none',
        boxShadow: '0 12px 28px rgba(245, 158, 11, 0.35)'
      },
      onClick: () => navigate('/admin/announcements#compose')
    }
  ];

  return (
    <div className="animate-fadeInUp">
      <div className="mb-4">
        <div
          className="p-4 p-md-5"
          style={{
            background: 'linear-gradient(120deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: '22px',
            color: '#ffffff',
            boxShadow: '0 18px 42px rgba(37, 99, 235, 0.35)'
          }}
        >
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <h3 className="mb-1" style={{ fontWeight: 800 }}>Admin Dashboard</h3>
              <p className="mb-4" style={{ opacity: 0.85 }}>Real-time monitoring and control</p>
              <Row className="g-3">
                <Col sm={3} xs={6}>
                  <div className="small text-uppercase" style={{ opacity: 0.7 }}>Students</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{stats.totalStudents}</div>
                </Col>
                <Col sm={3} xs={6}>
                  <div className="small text-uppercase" style={{ opacity: 0.7 }}>Teachers</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{stats.totalTeachers}</div>
                </Col>
                <Col sm={3} xs={6}>
                  <div className="small text-uppercase" style={{ opacity: 0.7 }}>Classes</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{stats.totalClasses}</div>
                </Col>
                <Col sm={3} xs={6}>
                  <div className="small text-uppercase" style={{ opacity: 0.7 }}>Attendance</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{stats.attendanceToday}</div>
                </Col>
              </Row>
            </div>
            <div className="ms-4 d-none d-sm-block">
              <div
                style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-tachometer-alt fa-lg" style={{ color: '#ffffff' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Row className="mb-4 g-3">
        {statCards.map(({ key, value, title, icon, badgeIcon, badgeLabel, accent }) => {
          const palette = accentPalette[accent];
          return (
            <Col md={3} sm={6} xs={12} key={key}>
              <Card
                className="text-center card-enhanced"
                style={{
                  background: palette.background,
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: palette.shadow,
                  minHeight: '100%'
                }}
              >
                <Card.Body className="p-4">
                  <div className="mb-3 d-flex justify-content-center">
                    <i
                      className={`${icon} fa-3x`}
                      style={{
                        background: palette.iconBackground,
                        borderRadius: '28px',
                        padding: '18px',
                        color: '#ffffff'
                      }}
                    ></i>
                  </div>
                  <h2 className="mb-2" style={{ fontSize: '2.35rem', fontWeight: 700 }}>{value}</h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: '#ffffff' }}>{title}</p>
                  <Badge
                    className="mt-3"
                    style={{
                      background: palette.badgeBackground,
                      color: palette.badgeColor,
                      border: 'none',
                      fontWeight: 700,
                      letterSpacing: '0.02em'
                    }}
                  >
                    <i className={`${badgeIcon} me-1`}></i>
                    {badgeLabel}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="g-4">
        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{
              background: 'linear-gradient(120deg, rgba(26, 115, 232, 0.95) 0%, rgba(21, 87, 188, 0.95) 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>
                Recent Activity
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="text-center py-4">
                <i className="fas fa-clock fa-3x text-muted mb-3"></i>
                <h6 className="text-muted">No recent activity to display</h6>
                <p className="text-muted small mb-0">Activity will appear here as users interact with the system</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{
              background: 'linear-gradient(120deg, rgba(161, 66, 244, 0.95) 0%, rgba(200, 81, 139, 0.95) 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-grid gap-3">
                {quickActions.map(({ key, label, icon, styles, onClick }) => (
                  <Button
                    key={key}
                    className="btn-enhanced d-flex align-items-center justify-content-center"
                    style={styles}
                    onClick={onClick}
                  >
                    <i className={`${icon} me-2`}></i>
                    {label}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminOverview;

