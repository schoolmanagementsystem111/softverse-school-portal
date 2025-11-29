import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Spinner } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

const TeacherOverview = () => {
  const { currentUser } = useAuth();
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      // Get assigned classes
      const classesQuery = query(collection(db, 'classes'), where('teacherId', '==', currentUser.uid));
      const classesSnapshot = await getDocs(classesQuery);
      setAssignedClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Get assigned subjects
      const subjectsQuery = query(collection(db, 'subjects'), where('teacherId', '==', currentUser.uid));
      const subjectsSnapshot = await getDocs(subjectsQuery);
      setAssignedSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Get recent attendance (last 5 records)
      const attendanceQuery = query(collection(db, 'attendance'), where('teacherId', '==', currentUser.uid));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceList = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentAttendance(attendanceList.slice(0, 5));

    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get class name by classId
  const getClassName = (classId) => {
    const classData = assignedClasses.find(cls => cls.id === classId);
    if (classData) {
      return `${classData.name} - ${classData.section} (Grade ${classData.grade})`;
    }
    return `Class ${classId}`;
  };

  if (loading) {
    return (
      <div className="text-center animate-fadeInUp">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="warning" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="text-muted">Loading your teaching data...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp">
      <div className="mb-4">
        <h2 className="mb-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          <i className="fas fa-chalkboard-teacher me-3"></i>
          Teacher Dashboard
        </h2>
        <p className="text-muted mb-0">Manage your classes, subjects, and track student progress</p>
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
                <i className="fas fa-chalkboard-teacher fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{assignedClasses.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Assigned Classes</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-users me-1"></i>
                Active
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
                <i className="fas fa-book fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{assignedSubjects.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Assigned Subjects</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-book-open me-1"></i>
                Teaching
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
                <i className="fas fa-calendar-check fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{recentAttendance.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Recent Attendance</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-chart-bar me-1"></i>
                Records
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
                <i className="fas fa-envelope fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>0</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Unread Messages</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-bell me-1"></i>
                All Read
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
                <i className="fas fa-chalkboard-teacher me-2"></i>
                Assigned Classes
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {assignedClasses.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Grade</th>
                        <th>Section</th>
                        <th>Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedClasses.map(cls => (
                        <tr key={cls.id}>
                          <td>{cls.name}</td>
                          <td>{cls.grade}</td>
                          <td>{cls.section}</td>
                          <td>{cls.capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-chalkboard-teacher fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No classes assigned yet</h6>
                  <p className="text-muted small">Your assigned classes will appear here</p>
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
                <i className="fas fa-book me-2"></i>
                Assigned Subjects
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {assignedSubjects.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedSubjects.map(subject => (
                        <tr key={subject.id}>
                          <td>{subject.name}</td>
                          <td>{subject.code}</td>
                          <td>{getClassName(subject.classId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-book fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No subjects assigned yet</h6>
                  <p className="text-muted small">Your assigned subjects will appear here</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={12}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-calendar-check me-2"></i>
                Recent Attendance
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {recentAttendance.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Class</th>
                        <th>Student</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAttendance.map(record => (
                        <tr key={record.id}>
                          <td>{record.date}</td>
                          <td>{record.className}</td>
                          <td>{record.studentName}</td>
                          <td>
                            <Badge bg={record.status === 'present' ? 'success' : 'danger'} className="badge-enhanced">
                              {record.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No attendance records yet</h6>
                  <p className="text-muted small">Attendance records will appear here once you start marking attendance</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherOverview;
