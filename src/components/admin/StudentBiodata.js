import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card, InputGroup } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const StudentBiodata = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleViewBiodata = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentBFormNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentCnic?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !filterClass || student.classId === filterClass;
    
    return matchesSearch && matchesClass;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handlePrintBiodata = () => {
    if (!selectedStudent) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Biodata - ${selectedStudent.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .biodata-section {
              margin-bottom: 30px;
            }
            .biodata-section h3 {
              background-color: #f0f0f0;
              padding: 10px;
              margin-bottom: 15px;
              border-left: 4px solid #007bff;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .info-label {
              font-weight: bold;
              width: 200px;
              color: #555;
            }
            .info-value {
              flex: 1;
              color: #333;
            }
            .photo-container {
              text-align: center;
              margin: 20px 0;
            }
            .photo-container img {
              max-width: 200px;
              max-height: 200px;
              border: 2px solid #333;
              border-radius: 8px;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Biodata</h1>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          
          ${selectedStudent.photoURL ? `
            <div class="photo-container">
              <img src="${selectedStudent.photoURL}" alt="Student Photo" />
            </div>
          ` : ''}
          
          <div class="biodata-section">
            <h3>Personal Information</h3>
            <div class="info-row">
              <span class="info-label">Full Name:</span>
              <span class="info-value">${selectedStudent.name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${selectedStudent.email || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${formatDate(selectedStudent.dob)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gender:</span>
              <span class="info-value">${selectedStudent.gender || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${selectedStudent.phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${selectedStudent.address || 'N/A'}</span>
            </div>
          </div>
          
          <div class="biodata-section">
            <h3>Academic Information</h3>
            <div class="info-row">
              <span class="info-label">Roll Number:</span>
              <span class="info-value">${selectedStudent.rollNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Class:</span>
              <span class="info-value">${getClassName(selectedStudent.classId)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">${selectedStudent.status || 'active'}</span>
            </div>
          </div>
          
          <div class="biodata-section">
            <h3>Identification Information</h3>
            <div class="info-row">
              <span class="info-label">B Form Number:</span>
              <span class="info-value">${selectedStudent.studentBFormNumber || 'N/A'}</span>
            </div>
          </div>
          
          <div class="biodata-section">
            <h3>Parent/Guardian Information</h3>
            <div class="info-row">
              <span class="info-label">Parent Name:</span>
              <span class="info-value">${selectedStudent.parentName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Parent CNIC:</span>
              <span class="info-value">${selectedStudent.parentCnic || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Parent Email:</span>
              <span class="info-value">${selectedStudent.parentId || 'N/A'}</span>
            </div>
          </div>
          
          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
            <p>This document was generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading student biodata...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Student Biodata</h2>
          <p className="text-muted mb-0">View and manage student biodata information</p>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, roll number, B form, or parent name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <Form.Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section} {cls.grade ? `(Grade ${cls.grade})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              Students ({filteredStudents.length})
            </h5>
          </div>
          
          <div className="table-responsive">
            <Table striped bordered hover className="table-enhanced">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Class</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {searchTerm || filterClass ? 'No students found matching your criteria' : 'No students found'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id}>
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
                      <td>{student.name}</td>
                      <td>{student.rollNumber || 'N/A'}</td>
                      <td>{getClassName(student.classId)}</td>
                      <td>{student.email}</td>
                      <td>{student.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge ${student.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                          {student.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleViewBiodata(student)}
                        >
                          <i className="fas fa-eye me-1"></i>
                          View Biodata
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Biodata Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-graduate me-2"></i>
            Student Biodata - {selectedStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              {selectedStudent.photoURL && (
                <div className="text-center mb-4">
                  <img 
                    src={selectedStudent.photoURL} 
                    alt={selectedStudent.name}
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '2px solid #ddd'
                    }}
                  />
                </div>
              )}
              
              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-primary text-white">
                      <strong>Personal Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Full Name:</strong> {selectedStudent.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedStudent.email || 'N/A'}</p>
                      <p><strong>Date of Birth:</strong> {formatDate(selectedStudent.dob)}</p>
                      <p><strong>Gender:</strong> {selectedStudent.gender || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedStudent.phone || 'N/A'}</p>
                      <p><strong>Address:</strong> {selectedStudent.address || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-success text-white">
                      <strong>Academic Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Roll Number:</strong> {selectedStudent.rollNumber || 'N/A'}</p>
                      <p><strong>Class:</strong> {getClassName(selectedStudent.classId)}</p>
                      <p><strong>Status:</strong> 
                        <span className={`badge ${selectedStudent.status === 'active' ? 'bg-success' : 'bg-warning'} ms-2`}>
                          {selectedStudent.status || 'active'}
                        </span>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-info text-white">
                      <strong>Identification Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>B Form Number:</strong> {selectedStudent.studentBFormNumber || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-warning text-dark">
                      <strong>Parent/Guardian Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Parent Name:</strong> {selectedStudent.parentName || 'N/A'}</p>
                      <p><strong>Parent CNIC:</strong> {selectedStudent.parentCnic || 'N/A'}</p>
                      <p><strong>Parent Email:</strong> {selectedStudent.parentId || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrintBiodata}>
            <i className="fas fa-print me-2"></i>
            Print Biodata
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StudentBiodata;

