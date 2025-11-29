import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Row, Col, Card, InputGroup, Badge } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const StudentContactList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentCnic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !filterClass || student.classId === filterClass;
    
    return matchesSearch && matchesClass;
  });

  const handlePrintContactList = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Contact List</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .no-data {
              text-align: center;
              padding: 20px;
              color: #666;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Contact List</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            ${filterClass ? `<p>Class: ${getClassName(filterClass)}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Student Phone</th>
                <th>Student Email</th>
                <th>Parent Name</th>
                <th>Parent CNIC</th>
                <th>Parent Email</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.length === 0 ? `
                <tr>
                  <td colspan="10" class="no-data">No students found</td>
                </tr>
              ` : filteredStudents.map((student, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${student.name || 'N/A'}</td>
                  <td>${student.rollNumber || 'N/A'}</td>
                  <td>${getClassName(student.classId)}</td>
                  <td>${student.phone || 'N/A'}</td>
                  <td>${student.email || 'N/A'}</td>
                  <td>${student.parentName || 'N/A'}</td>
                  <td>${student.parentCnic || 'N/A'}</td>
                  <td>${student.parentId || 'N/A'}</td>
                  <td>${student.address || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 10px;">
            <p>Total Students: ${filteredStudents.length}</p>
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

  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Class',
      'Student Phone',
      'Student Email',
      'Parent Name',
      'Parent CNIC',
      'Parent Email',
      'Address'
    ];

    const csvRows = [
      headers.join(',')
    ];

    filteredStudents.forEach((student, index) => {
      const row = [
        index + 1,
        `"${student.name || 'N/A'}"`,
        `"${student.rollNumber || 'N/A'}"`,
        `"${getClassName(student.classId)}"`,
        `"${student.phone || 'N/A'}"`,
        `"${student.email || 'N/A'}"`,
        `"${student.parentName || 'N/A'}"`,
        `"${student.parentCnic || 'N/A'}"`,
        `"${student.parentId || 'N/A'}"`,
        `"${student.address || 'N/A'}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student_contact_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading student contact list...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Student Contact List</h2>
          <p className="text-muted mb-0">View and export student contact information</p>
        </div>
        <div>
          <Button variant="outline-primary" onClick={handlePrintContactList} className="me-2">
            <i className="fas fa-print me-2"></i>
            Print List
          </Button>
          <Button variant="outline-success" onClick={handleExportCSV}>
            <i className="fas fa-download me-2"></i>
            Export CSV
          </Button>
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
                  placeholder="Search by name, email, phone, roll number, parent name, or address..."
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
            <div>
              {filteredStudents.length > 0 && (
                <>
                  <Button variant="outline-primary" size="sm" onClick={handlePrintContactList} className="me-2">
                    <i className="fas fa-print me-1"></i>
                    Print
                  </Button>
                  <Button variant="outline-success" size="sm" onClick={handleExportCSV}>
                    <i className="fas fa-download me-1"></i>
                    Export CSV
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="table-responsive">
            <Table striped bordered hover className="table-enhanced">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Student Phone</th>
                  <th>Student Email</th>
                  <th>Parent Name</th>
                  <th>Parent CNIC</th>
                  <th>Parent Email</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-4">
                      {searchTerm || filterClass ? 'No students found matching your criteria' : 'No students found'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          {student.photoURL && (
                            <img 
                              src={student.photoURL} 
                              alt={student.name}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                marginRight: '10px'
                              }}
                            />
                          )}
                          <strong>{student.name}</strong>
                        </div>
                      </td>
                      <td>{student.rollNumber || 'N/A'}</td>
                      <td>
                        <Badge bg="info">{getClassName(student.classId)}</Badge>
                      </td>
                      <td>
                        {student.phone ? (
                          <a href={`tel:${student.phone}`} className="text-decoration-none">
                            <i className="fas fa-phone me-1"></i>
                            {student.phone}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>
                        {student.email ? (
                          <a href={`mailto:${student.email}`} className="text-decoration-none">
                            <i className="fas fa-envelope me-1"></i>
                            {student.email}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>{student.parentName || 'N/A'}</td>
                      <td>{student.parentCnic || 'N/A'}</td>
                      <td>
                        {student.parentId ? (
                          <a href={`mailto:${student.parentId}`} className="text-decoration-none">
                            <i className="fas fa-envelope me-1"></i>
                            {student.parentId}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>{student.address || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default StudentContactList;

