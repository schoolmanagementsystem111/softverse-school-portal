import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

const ParentOverview = () => {
  const { currentUser } = useAuth();
  const [children, setChildren] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    try {
      // Get children
      const childrenQuery = query(collection(db, 'users'), where('parentId', '==', currentUser.uid));
      const childrenSnapshot = await getDocs(childrenQuery);
      const childrenList = childrenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChildren(childrenList);

      // Get recent grades for children
      const childIds = childrenList.map(child => child.id);
      if (childIds.length > 0) {
        const gradesQuery = query(collection(db, 'grades'), where('studentId', 'in', childIds));
        const gradesSnapshot = await getDocs(gradesQuery);
        const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentGrades(gradesList.slice(0, 5));

        // Get attendance stats
        const attendanceQuery = query(collection(db, 'attendance'), where('studentId', 'in', childIds));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceList = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const stats = calculateAttendanceStats(attendanceList);
        setAttendanceStats(stats);
      }

      // Get messages
      const messagesQuery = query(collection(db, 'messages'), where('parentId', '==', currentUser.uid));
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesList = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesList.slice(0, 3));

    } catch (error) {
      console.error('Error fetching parent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceStats = (attendanceList) => {
    const totalDays = attendanceList.length;
    const presentDays = attendanceList.filter(record => record.status === 'present').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      attendancePercentage
    };
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'danger';
  };

  if (loading) {
    return (
      <div className="text-center animate-fadeInUp">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="info" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="text-muted">Loading your children's data...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp">
      <div className="mb-4">
        <h2 className="mb-1" style={{ background: 'var(--gradient-secondary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          <i className="fas fa-users me-3"></i>
          Parent Dashboard
        </h2>
        <p className="text-muted mb-0">Monitor your children's academic progress and stay connected with the school</p>
      </div>
      
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center card-enhanced" style={{ 
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
          }}>
            <Card.Body className="p-4">
              <div className="mb-3">
                <i className="fas fa-child fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{children.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Children</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-heart me-1"></i>
                Enrolled
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center card-enhanced" style={{ 
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)'
          }}>
            <Card.Body className="p-4">
              <div className="mb-3">
                <i className="fas fa-calendar-check fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{attendanceStats.attendancePercentage?.toFixed(1) || 0}%</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Attendance Rate</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-check-circle me-1"></i>
                {attendanceStats.presentDays || 0} Present
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center card-enhanced" style={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)'
          }}>
            <Card.Body className="p-4">
              <div className="mb-3">
                <i className="fas fa-envelope fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{messages.filter(m => !m.read).length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Unread Messages</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-bell me-1"></i>
                {messages.filter(m => !m.read).length > 0 ? 'New' : 'All Read'}
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center card-enhanced" style={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)'
          }}>
            <Card.Body className="p-4">
              <div className="mb-3">
                <i className="fas fa-graduation-cap fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{recentGrades.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Recent Grades</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-chart-line me-1"></i>
                Latest
              </Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'var(--gradient-primary)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-child me-2"></i>
                Children Information
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {children.length > 0 ? (
                <div className="table-responsive">
                <Table striped bordered hover size="sm" className="table-enhanced">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Roll Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map(child => (
                      <tr key={child.id}>
                        <td>{child.name}</td>
                        <td>{child.classId}</td>
                        <td>{child.rollNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-child fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No children registered yet</h6>
                  <p className="text-muted small">Your children's information will appear here once they're enrolled</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>
                Recent Grades
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {recentGrades.length > 0 ? (
                <div className="table-responsive">
                <Table striped bordered hover size="sm" className="table-enhanced">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Grade</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrades.map(grade => (
                      <tr key={grade.id}>
                        <td>{grade.subjectName}</td>
                        <td>
                          <Badge bg={getGradeColor(grade.percentage)} className="badge-enhanced">
                            {grade.percentage >= 90 ? 'A+' :
                             grade.percentage >= 80 ? 'A' :
                             grade.percentage >= 70 ? 'B' :
                             grade.percentage >= 60 ? 'C' : 'D'}
                          </Badge>
                        </td>
                        <td>{grade.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-graduation-cap fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No grades available yet</h6>
                  <p className="text-muted small">Your children's grades will appear here once exams are completed</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-calendar-check me-2"></i>
                Attendance Overview
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Overall Attendance</span>
                  <span>{attendanceStats.attendancePercentage?.toFixed(1) || 0}%</span>
                </div>
                <ProgressBar 
                  variant={attendanceStats.attendancePercentage >= 80 ? 'success' : 'warning'}
                  now={attendanceStats.attendancePercentage || 0}
                  className="progress-enhanced"
                />
              </div>
              <div className="row text-center">
                <div className="col">
                  <h5 className="text-success">{attendanceStats.presentDays || 0}</h5>
                  <small>Present Days</small>
                </div>
                <div className="col">
                  <h5 className="text-danger">{attendanceStats.absentDays || 0}</h5>
                  <small>Absent Days</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-envelope me-2"></i>
                Recent Messages
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {messages.length > 0 ? (
                messages.map(message => (
                  <div key={message.id} className="mb-3 p-3 border rounded card-enhanced" style={{ 
                    background: 'rgba(79, 172, 254, 0.05)',
                    border: '1px solid rgba(79, 172, 254, 0.2) !important'
                  }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <strong className="text-primary">{message.subject}</strong>
                      <Badge bg={message.read ? 'success' : 'warning'} className="badge-enhanced">
                        {message.read ? 'Read' : 'Unread'}
                      </Badge>
                    </div>
                    <small className="text-muted d-block mb-2">
                      <i className="fas fa-user me-1"></i>
                      From: {message.teacherName}
                    </small>
                    <p className="mb-0 text-muted">{message.message.substring(0, 50)}...</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-envelope fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No messages yet</h6>
                  <p className="text-muted small">Messages from teachers will appear here</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ParentOverview;
