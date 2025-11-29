import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card, InputGroup, Badge, Accordion } from 'react-bootstrap';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const SiblingManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [siblingGroups, setSiblingGroups] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      groupSiblings();
    }
  }, [students, searchTerm]);

  const fetchData = async () => {
    try {
      const [studentsSnapshot, classesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'classes'))
      ]);
      setStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassName = (classId) => {
    if (!classId) return 'N/A';
    const cls = classes.find(c => c.id === classId);
    if (!cls) return classId;
    return `${cls.name}${cls.section ? ' - ' + cls.section : ''}${cls.grade ? ' (Grade ' + cls.grade + ')' : ''}`;
  };

  const groupSiblings = () => {
    // Group students by parent CNIC (most reliable way to identify siblings)
    const groups = {};
    
    let filteredStudents = students;
    if (searchTerm) {
      filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentCnic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filteredStudents.forEach(student => {
      // Use parent CNIC as the key for grouping siblings
      const key = student.parentCnic || student.parentId || 'no-parent';
      
      if (!groups[key]) {
        groups[key] = {
          parentCnic: student.parentCnic || 'N/A',
          parentName: student.parentName || 'N/A',
          parentEmail: student.parentId || 'N/A',
          students: []
        };
      }
      groups[key].students.push(student);
    });

    // Convert to array and sort by number of siblings
    const groupsArray = Object.values(groups)
      .filter(group => group.students.length > 0)
      .sort((a, b) => b.students.length - a.students.length);

    setSiblingGroups(groupsArray);
  };

  const handleViewSiblings = (student) => {
    setSelectedStudent(student);
    // Find all siblings of this student
    const siblings = students.filter(s => 
      s.id !== student.id && 
      (s.parentCnic === student.parentCnic || s.parentId === student.parentId)
    );
    setSelectedStudent({ ...student, siblings });
    setShowModal(true);
  };

  const handleLinkSiblings = async (student1, student2) => {
    try {
      // Link siblings by making them share the same parent CNIC
      const parentCnic = student1.parentCnic || student2.parentCnic;
      const parentName = student1.parentName || student2.parentName;
      const parentEmail = student1.parentId || student2.parentId;

      if (!parentCnic && !parentEmail) {
        alert('Cannot link siblings: Both students must have parent information');
        return;
      }

      // Update both students to have the same parent information
      const updates = [];
      if (student1.parentCnic !== parentCnic || student1.parentName !== parentName || student1.parentId !== parentEmail) {
        updates.push(updateDoc(doc(db, 'users', student1.id), {
          parentCnic: parentCnic || student1.parentCnic,
          parentName: parentName || student1.parentName,
          parentId: parentEmail || student1.parentId
        }));
      }
      if (student2.parentCnic !== parentCnic || student2.parentName !== parentName || student2.parentId !== parentEmail) {
        updates.push(updateDoc(doc(db, 'users', student2.id), {
          parentCnic: parentCnic || student2.parentCnic,
          parentName: parentName || student2.parentName,
          parentId: parentEmail || student2.parentId
        }));
      }

      await Promise.all(updates);
      alert('Siblings linked successfully!');
      fetchData();
    } catch (error) {
      console.error('Error linking siblings:', error);
      alert('Failed to link siblings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading sibling information...</p>
        </div>
      </div>
    );
  }

  const totalSiblings = siblingGroups.reduce((sum, group) => sum + group.students.length, 0);
  const studentsWithSiblings = siblingGroups.filter(g => g.students.length > 1).reduce((sum, g) => sum + g.students.length, 0);
  const studentsWithoutSiblings = students.length - totalSiblings + siblingGroups.filter(g => g.students.length === 1).length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Sibling Student Information</h2>
          <p className="text-muted mb-0">View and manage sibling relationships among students</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{siblingGroups.length}</h3>
              <p className="text-muted mb-0">Parent Groups</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{studentsWithSiblings}</h3>
              <p className="text-muted mb-0">Students with Siblings</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{studentsWithoutSiblings}</h3>
              <p className="text-muted mb-0">Students without Siblings</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by student name, roll number, parent name, parent CNIC, or parent email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              Sibling Groups ({siblingGroups.length})
            </h5>
          </div>

          {siblingGroups.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="fas fa-users fa-3x mb-3" style={{ opacity: 0.3 }}></i>
              <p>No sibling groups found</p>
            </div>
          ) : (
            <Accordion>
              {siblingGroups.map((group, groupIndex) => (
                <Accordion.Item eventKey={groupIndex.toString()} key={groupIndex}>
                  <Accordion.Header>
                    <div className="d-flex align-items-center w-100">
                      <div className="flex-grow-1">
                        <strong>
                          {group.parentName !== 'N/A' ? group.parentName : 'Unknown Parent'}
                        </strong>
                        <span className="ms-3 text-muted">
                          ({group.students.length} {group.students.length === 1 ? 'student' : 'students'})
                        </span>
                        {group.students.length > 1 && (
                          <Badge bg="success" className="ms-2">
                            <i className="fas fa-users me-1"></i>
                            Siblings
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="mb-3">
                      <Row>
                        <Col md={4}>
                          <p><strong>Parent Name:</strong> {group.parentName}</p>
                        </Col>
                        <Col md={4}>
                          <p><strong>Parent CNIC:</strong> {group.parentCnic}</p>
                        </Col>
                        <Col md={4}>
                          <p><strong>Parent Email:</strong> 
                            {group.parentEmail !== 'N/A' ? (
                              <a href={`mailto:${group.parentEmail}`} className="ms-2">
                                {group.parentEmail}
                              </a>
                            ) : (
                              <span className="ms-2">N/A</span>
                            )}
                          </p>
                        </Col>
                      </Row>
                    </div>
                    
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Photo</th>
                          <th>Student Name</th>
                          <th>Roll Number</th>
                          <th>Class</th>
                          <th>Gender</th>
                          <th>Date of Birth</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.students.map((student, index) => (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td className="text-center">
                              {student.photoURL ? (
                                <img 
                                  src={student.photoURL} 
                                  alt={student.name}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ddd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto'
                                  }}
                                >
                                  <i className="fas fa-user text-muted"></i>
                                </div>
                              )}
                            </td>
                            <td><strong>{student.name}</strong></td>
                            <td>{student.rollNumber || 'N/A'}</td>
                            <td>
                              <Badge bg="info">{getClassName(student.classId)}</Badge>
                            </td>
                            <td>{student.gender || 'N/A'}</td>
                            <td>
                              {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              <Badge bg={student.status === 'active' ? 'success' : 'warning'}>
                                {student.status || 'active'}
                              </Badge>
                            </td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleViewSiblings(student)}
                              >
                                <i className="fas fa-eye me-1"></i>
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Body>
      </Card>

      {/* Student Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-users me-2"></i>
            Student & Sibling Information - {selectedStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-primary text-white">
                      <strong>Student Information</strong>
                    </Card.Header>
                    <Card.Body>
                      {selectedStudent.photoURL && (
                        <div className="text-center mb-3">
                          <img 
                            src={selectedStudent.photoURL} 
                            alt={selectedStudent.name}
                            style={{
                              maxWidth: '150px',
                              maxHeight: '150px',
                              borderRadius: '8px',
                              border: '2px solid #ddd'
                            }}
                          />
                        </div>
                      )}
                      <p><strong>Name:</strong> {selectedStudent.name}</p>
                      <p><strong>Roll Number:</strong> {selectedStudent.rollNumber || 'N/A'}</p>
                      <p><strong>Class:</strong> {getClassName(selectedStudent.classId)}</p>
                      <p><strong>Email:</strong> {selectedStudent.email}</p>
                      <p><strong>Phone:</strong> {selectedStudent.phone || 'N/A'}</p>
                      <p><strong>Date of Birth:</strong> {
                        selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : 'N/A'
                      }</p>
                      <p><strong>Gender:</strong> {selectedStudent.gender || 'N/A'}</p>
                      <p><strong>Status:</strong> 
                        <Badge bg={selectedStudent.status === 'active' ? 'success' : 'warning'} className="ms-2">
                          {selectedStudent.status || 'active'}
                        </Badge>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-success text-white">
                      <strong>Parent Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Parent Name:</strong> {selectedStudent.parentName || 'N/A'}</p>
                      <p><strong>Parent CNIC:</strong> {selectedStudent.parentCnic || 'N/A'}</p>
                      <p><strong>Parent Email:</strong> 
                        {selectedStudent.parentId ? (
                          <a href={`mailto:${selectedStudent.parentId}`}>
                            {selectedStudent.parentId}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                      <p><strong>Address:</strong> {selectedStudent.address || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {selectedStudent.siblings && selectedStudent.siblings.length > 0 && (
                <Card>
                  <Card.Header className="bg-info text-white">
                    <strong>
                      <i className="fas fa-users me-2"></i>
                      Siblings ({selectedStudent.siblings.length})
                    </strong>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Roll Number</th>
                          <th>Class</th>
                          <th>Gender</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudent.siblings.map((sibling) => (
                          <tr key={sibling.id}>
                            <td><strong>{sibling.name}</strong></td>
                            <td>{sibling.rollNumber || 'N/A'}</td>
                            <td>{getClassName(sibling.classId)}</td>
                            <td>{sibling.gender || 'N/A'}</td>
                            <td>
                              <Badge bg={sibling.status === 'active' ? 'success' : 'warning'}>
                                {sibling.status || 'active'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}

              {(!selectedStudent.siblings || selectedStudent.siblings.length === 0) && (
                <Card>
                  <Card.Body className="text-center text-muted">
                    <i className="fas fa-user-times fa-2x mb-2" style={{ opacity: 0.3 }}></i>
                    <p>No siblings found for this student</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SiblingManagement;

