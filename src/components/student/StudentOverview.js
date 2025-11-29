import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

const StudentOverview = () => {
  const { currentUser } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      // Get student info
      const studentQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const studentSnapshot = await getDocs(studentQuery);
      const studentData = studentSnapshot.docs[0]?.data();
      setStudentInfo(studentData);

      if (studentData) {
        // Get grades
        const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', currentUser.uid));
        const gradesSnapshot = await getDocs(gradesQuery);
        const gradesList = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGrades(gradesList);

        // Get attendance
        const attendanceQuery = query(collection(db, 'attendance'), where('studentId', '==', currentUser.uid));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceList = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendance(attendanceList);

        // Get subjects for this student's class
        if (studentData.classId) {
          const subjectsQuery = query(collection(db, 'subjects'), where('classId', '==', studentData.classId));
          const subjectsSnapshot = await getDocs(subjectsQuery);
          const subjectsList = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSubjects(subjectsList);
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const totalDays = attendance.length;
    const presentDays = attendance.filter(record => record.status === 'present').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      attendancePercentage
    };
  };

  const getOverallAverage = () => {
    if (grades.length === 0) return 0;
    const totalPercentage = grades.reduce((sum, grade) => sum + grade.percentage, 0);
    return totalPercentage / grades.length;
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
          <Spinner animation="border" variant="success" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="text-muted">Loading your academic data...</h5>
        </div>
      </div>
    );
  }

  const attendanceStats = getAttendanceStats();
  const overallAverage = getOverallAverage();

  return (
    <div className="animate-fadeInUp">
      <div className="mb-4">
        <h2 className="mb-1" style={{ background: 'var(--gradient-success)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          <i className="fas fa-user-graduate me-3"></i>
          Student Dashboard
        </h2>
        <p className="text-muted mb-0">Welcome back, {studentInfo?.name || 'Student'}! Track your academic progress</p>
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
                <i className="fas fa-user-graduate fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h4 className="mb-2" style={{ fontSize: '1.5rem', fontWeight: '700' }}>{studentInfo?.name || 'N/A'}</h4>
              <p className="mb-0" style={{ fontSize: '1rem', opacity: '0.9' }}>Student Name</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-id-card me-1"></i>
                {studentInfo?.rollNumber || 'N/A'}
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
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{attendanceStats.attendancePercentage ? attendanceStats.attendancePercentage.toFixed(1) : '0.0'}%</h2>
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
                <i className="fas fa-graduation-cap fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{overallAverage ? overallAverage.toFixed(1) : '0.0'}%</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Overall Average</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-star me-1"></i>
                {overallAverage >= 90 ? 'Excellent' : overallAverage >= 80 ? 'Good' : overallAverage >= 70 ? 'Average' : 'Needs Improvement'}
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
                <i className="fas fa-book fa-3x" style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}></i>
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>{subjects.length}</h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>Subjects</p>
              <Badge bg="light" text="dark" className="mt-2 badge-enhanced">
                <i className="fas fa-book-open me-1"></i>
                Enrolled
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
                <i className="fas fa-chart-line me-2"></i>
                Recent Grades
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {grades.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Exam Type</th>
                        <th>Grade</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.slice(0, 5).map(grade => (
                        <tr key={grade.id}>
                          <td>{grade.subjectName}</td>
                          <td>{grade.examType}</td>
                          <td>
                            <Badge bg={getGradeColor(grade.percentage)} className="badge-enhanced">
                              {grade.percentage >= 90 ? 'A+' :
                               grade.percentage >= 80 ? 'A' :
                               grade.percentage >= 70 ? 'B' :
                               grade.percentage >= 60 ? 'C' : 'D'}
                            </Badge>
                          </td>
                          <td>{grade.percentage ? grade.percentage.toFixed(1) : '0.0'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-graduation-cap fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No grades available yet</h6>
                  <p className="text-muted small">Your grades will appear here once exams are completed</p>
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
                <i className="fas fa-calendar-check me-2"></i>
                Attendance Overview
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Overall Attendance</span>
                  <span>{attendanceStats.attendancePercentage ? attendanceStats.attendancePercentage.toFixed(1) : '0.0'}%</span>
                </div>
                <ProgressBar 
                  variant={attendanceStats.attendancePercentage >= 80 ? 'success' : 'warning'}
                  now={attendanceStats.attendancePercentage}
                  className="progress-enhanced"
                />
              </div>
              <div className="row text-center">
                <div className="col">
                  <h5 className="text-success">{attendanceStats.presentDays}</h5>
                  <small>Present Days</small>
                </div>
                <div className="col">
                  <h5 className="text-danger">{attendanceStats.absentDays}</h5>
                  <small>Absent Days</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={12}>
          <Card className="card-enhanced">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none'
            }}>
              <h5 className="mb-0">
                <i className="fas fa-book me-2"></i>
                My Subjects
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {subjects.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Subject Code</th>
                        <th>Teacher</th>
                        <th>Recent Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(subject => {
                        const subjectGrades = grades.filter(grade => grade.subjectId === subject.id);
                        const latestGrade = subjectGrades.length > 0 ? subjectGrades[subjectGrades.length - 1] : null;
                        
                        return (
                          <tr key={subject.id}>
                            <td>{subject.name}</td>
                            <td>{subject.code}</td>
                            <td>{subject.teacherName || 'Not Assigned'}</td>
                            <td>
                              {latestGrade ? (
                                <Badge bg={getGradeColor(latestGrade.percentage)} className="badge-enhanced">
                                  {latestGrade.percentage ? latestGrade.percentage.toFixed(1) : '0.0'}%
                                </Badge>
                              ) : (
                                <span className="text-muted">No grades yet</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-book fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No subjects assigned yet</h6>
                  <p className="text-muted small">Your subjects will appear here once you're enrolled in classes</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentOverview;
