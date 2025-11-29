import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

const ClassAttendance = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    }
  }, [selectedClass, attendanceDate]);

  const fetchTeacherClasses = async () => {
    try {
      const classesQuery = query(collection(db, 'classes'), where('teacherId', '==', currentUser.uid));
      const classesSnapshot = await getDocs(classesQuery);
      setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    try {
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('classId', '==', selectedClass));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsList);
      
      // Fetch existing attendance for this class/date and pre-fill
      const existingQuery = query(collection(db, 'attendance'), where('classId', '==', selectedClass));
      const existingSnap = await getDocs(existingQuery);
      const existingList = existingSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.date === attendanceDate);

      // Build map of latest status per student for the selected date
      const latestByStudent = {};
      existingList.forEach(r => {
        const ts = r.createdAt && typeof r.createdAt.toMillis === 'function' ? r.createdAt.toMillis() : (r.createdAt ? new Date(r.createdAt).getTime() : 0);
        const current = latestByStudent[r.studentId];
        if (!current || ts > current._ts) {
          latestByStudent[r.studentId] = { status: r.status, _ts: ts };
        }
      });

      // Initialize attendance records using last marked status or default 'present'
      const initialRecords = {};
      studentsList.forEach(student => {
        initialRecords[student.id] = latestByStudent[student.id]?.status || 'present';
      });
      setAttendanceRecords(initialRecords);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async () => {
    try {
      console.log('Submitting attendance for students:', students);
      const attendancePromises = students.map(student => {
        const attendanceData = {
          studentId: student.id,
          studentName: student.name,
          classId: selectedClass,
          className: classes.find(c => c.id === selectedClass)?.name,
          teacherId: currentUser.uid,
          teacherName: currentUser.displayName,
          date: attendanceDate,
          status: attendanceRecords[student.id],
          time: new Date().toLocaleTimeString(),
          createdAt: new Date()
        };
        console.log('Saving attendance for student:', student.name, 'with ID:', student.id, 'data:', attendanceData);
        return addDoc(collection(db, 'attendance'), attendanceData);
      });

      await Promise.all(attendancePromises);
      alert('Attendance marked successfully!');
      
      // Reset form
      setAttendanceRecords({});
      setStudents([]);
      setSelectedClass('');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Error marking attendance. Please try again.');
    }
  };

  const getAttendanceStats = () => {
    const totalStudents = students.length;
    const presentStudents = Object.values(attendanceRecords).filter(status => status === 'present').length;
    const absentStudents = totalStudents - presentStudents;
    const attendancePercentage = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

    return {
      totalStudents,
      presentStudents,
      absentStudents,
      attendancePercentage
    };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2 className="mb-4">Mark Class Attendance</h2>
      
      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Select Class</Form.Label>
            <Form.Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Choose a class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button 
            variant="primary" 
            onClick={submitAttendance}
            disabled={!selectedClass || students.length === 0}
          >
            Submit Attendance
          </Button>
        </Col>
      </Row>

      {selectedClass && students.length > 0 && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-primary">
                    <i className="fas fa-users fa-2x"></i>
                  </Card.Title>
                  <Card.Text>
                    <h3>{stats.totalStudents}</h3>
                    <p className="text-muted">Total Students</p>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-success">
                    <i className="fas fa-check-circle fa-2x"></i>
                  </Card.Title>
                  <Card.Text>
                    <h3>{stats.presentStudents}</h3>
                    <p className="text-muted">Present</p>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-danger">
                    <i className="fas fa-times-circle fa-2x"></i>
                  </Card.Title>
                  <Card.Text>
                    <h3>{stats.absentStudents}</h3>
                    <p className="text-muted">Absent</p>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-info">
                    <i className="fas fa-percentage fa-2x"></i>
                  </Card.Title>
                  <Card.Text>
                    <h3>{stats.attendancePercentage.toFixed(1)}%</h3>
                    <p className="text-muted">Attendance Rate</p>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card>
            <Card.Header>
              <h5>Student Attendance</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => {
                    const status = attendanceRecords[student.id] || 'present';
                    const badgeVariant = status === 'present' ? 'success' : (status === 'absent' ? 'danger' : 'warning');
                    const displayStatus = status === 'leave' ? 'on leave' : status;
                    return (
                      <tr key={student.id}>
                        <td>{student.rollNumber || '-'}</td>
                        <td>{student.name}</td>
                        <td>
                          <Badge bg={badgeVariant}>
                            {displayStatus}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                            >
                              Mark Present
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                            >
                              Mark Absent
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleAttendanceChange(student.id, 'leave')}
                            >
                              Mark On Leave
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClassAttendance;
