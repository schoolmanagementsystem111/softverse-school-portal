import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

const FeeDefaulters = () => {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchDefaulters();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const classesRef = collection(db, 'classes');
      const classesSnapshot = await getDocs(classesRef);
      const classesList = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesList);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchDefaulters = async () => {
    try {
      setLoading(true);
      const chalansRef = collection(db, 'feeChalans');
      const chalansQuery = query(chalansRef, orderBy('createdAt', 'desc'));
      const chalansSnapshot = await getDocs(chalansQuery);
      const chalansList = chalansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter chalans that are not fully paid
      const unpaidChalans = chalansList.filter(chalan => {
        const status = chalan.status || 'pending';
        const totalDue = chalan.totalDueAmount || 0;
        const totalPaid = chalan.totalPaidAmount || 0;
        const totalAmount = chalan.fees?.totalAmount || 0;
        
        // Consider as defaulter if:
        // 1. Status is pending, partial, or overdue
        // 2. OR totalDueAmount > 0
        // 3. OR totalPaidAmount < totalAmount (not fully paid)
        return (
          (status === 'pending' || status === 'partial' || status === 'overdue') ||
          totalDue > 0 ||
          totalPaid < totalAmount
        );
      });

      // Group by student and calculate totals
      const defaulterMap = {};
      unpaidChalans.forEach(chalan => {
        const studentId = chalan.studentId;
        if (!studentId) return;

        if (!defaulterMap[studentId]) {
          defaulterMap[studentId] = {
            studentId: studentId,
            studentName: chalan.studentName || 'Unknown',
            rollNumber: chalan.studentRollNumber || 'N/A',
            className: chalan.className || 'N/A',
            classId: chalan.classId || '',
            totalOutstanding: 0,
            totalPaid: 0,
            totalDue: 0,
            chalansCount: 0,
            chalans: []
          };
        }

        const totalAmount = chalan.fees?.totalAmount || 0;
        const totalPaid = chalan.totalPaidAmount || 0;
        // totalDueAmount already includes fines and discounts, so use it directly
        // If totalDueAmount is not set, calculate it (for older records)
        const totalDue = chalan.totalDueAmount !== undefined && chalan.totalDueAmount !== null
          ? chalan.totalDueAmount 
          : Math.max(0, totalAmount - totalPaid);
        const fine = chalan.payment?.fine || 0;
        const discount = chalan.payment?.discount || 0;

        // Outstanding amount is the totalDue (which already accounts for fines/discounts)
        defaulterMap[studentId].totalOutstanding += totalDue;
        defaulterMap[studentId].totalPaid += totalPaid;
        defaulterMap[studentId].totalDue += totalDue;
        defaulterMap[studentId].chalansCount += 1;
        defaulterMap[studentId].chalans.push({
          chalanId: chalan.id,
          chalanNumber: chalan.chalanNumber || 'N/A',
          dueDate: chalan.dueDate,
          status: chalan.status || 'pending',
          totalAmount: totalAmount,
          totalPaid: totalPaid,
          totalDue: totalDue,
          fine: fine,
          discount: discount
        });
      });

      // Convert to array and sort by total outstanding (highest first)
      const defaultersList = Object.values(defaulterMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      setDefaulters(defaultersList);

      if (defaultersList.length === 0) {
        setMessage('No fee defaulters found. All fees are paid!');
        setMessageType('success');
      } else {
        setMessage(`Found ${defaultersList.length} fee defaulter(s)`);
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error fetching fee defaulters:', error);
      setMessage('Error fetching fee defaulters. Please try again.');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge bg="success">Paid</Badge>;
      case 'partial':
        return <Badge bg="info">Partial</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'overdue':
        return <Badge bg="danger">Overdue</Badge>;
      default:
        return <Badge bg="secondary">{status || 'Pending'}</Badge>;
    }
  };

  const getClassName = (classId) => {
    const classData = classes.find(cls => cls.id === classId);
    if (classData) {
      return `${classData.name} - ${classData.section} (Grade ${classData.grade})`;
    }
    return classId || 'N/A';
  };

  // Filter defaulters based on search term and class
  const filteredDefaulters = defaulters.filter(defaulter => {
    const matchesSearch = 
      defaulter.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defaulter.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defaulter.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !filterClass || defaulter.classId === filterClass;
    
    return matchesSearch && matchesClass;
  });

  const totalOutstanding = filteredDefaulters.reduce((sum, def) => sum + def.totalOutstanding, 0);

  return (
    <div className="container-fluid py-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Fee Defaulters
              </h4>
            </Card.Header>
            <Card.Body>
              {message && (
                <Alert variant={messageType} dismissible onClose={() => setMessage('')}>
                  {message}
                </Alert>
              )}

              {/* Filters */}
              <Row className="mb-4">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="fas fa-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search by name, roll number, or class..."
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
                        {cls.name} - {cls.section} (Grade {cls.grade})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              {/* Summary */}
              {filteredDefaulters.length > 0 && (
                <Alert variant="warning" className="mb-3">
                  <strong>Total Outstanding Amount: PKR {totalOutstanding.toLocaleString()}</strong>
                  <br />
                  <small>Showing {filteredDefaulters.length} defaulter(s)</small>
                </Alert>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading fee defaulters...</p>
                </div>
              ) : filteredDefaulters.length === 0 ? (
                <Alert variant="success" className="text-center">
                  <i className="fas fa-check-circle fa-2x mb-3"></i>
                  <h5>No Fee Defaulters Found</h5>
                  <p className="mb-0">All students have cleared their fees!</p>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Roll Number</th>
                        <th>Class</th>
                        <th>Chalans</th>
                        <th>Total Outstanding (PKR)</th>
                        <th>Total Paid (PKR)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDefaulters.map((defaulter, index) => (
                        <tr key={defaulter.studentId}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{defaulter.studentName}</strong>
                          </td>
                          <td>{defaulter.rollNumber}</td>
                          <td>{getClassName(defaulter.classId)}</td>
                          <td>
                            <Badge bg="secondary">{defaulter.chalansCount}</Badge>
                            <small className="text-muted ms-2">
                              {defaulter.chalansCount === 1 ? 'chalan' : 'chalans'}
                            </small>
                          </td>
                          <td>
                            <strong className="text-danger">
                              {defaulter.totalOutstanding.toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            <span className="text-success">
                              {defaulter.totalPaid.toLocaleString()}
                            </span>
                          </td>
                          <td>
                            {defaulter.chalans.some(c => c.status === 'overdue') ? (
                              <Badge bg="danger">Overdue</Badge>
                            ) : defaulter.chalans.some(c => c.status === 'partial') ? (
                              <Badge bg="info">Partial</Badge>
                            ) : (
                              <Badge bg="warning">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-secondary">
                      <tr>
                        <td colSpan="5" className="text-end">
                          <strong>Total Outstanding:</strong>
                        </td>
                        <td>
                          <strong className="text-danger">
                            PKR {totalOutstanding.toLocaleString()}
                          </strong>
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              )}

              {/* Detailed View for each defaulter */}
              {filteredDefaulters.length > 0 && (
                <div className="mt-4">
                  <h5 className="mb-3">
                    <i className="fas fa-list me-2"></i>
                    Detailed View
                  </h5>
                  {filteredDefaulters.map((defaulter) => (
                    <Card key={defaulter.studentId} className="mb-3">
                      <Card.Header className="bg-light">
                        <strong>{defaulter.studentName}</strong> - {getClassName(defaulter.classId)}
                        <span className="float-end">
                          Total Outstanding: <strong className="text-danger">PKR {defaulter.totalOutstanding.toLocaleString()}</strong>
                        </span>
                      </Card.Header>
                      <Card.Body>
                        <Table size="sm" bordered>
                          <thead>
                            <tr>
                              <th>Chalan #</th>
                              <th>Due Date</th>
                              <th>Total Amount</th>
                              <th>Paid Amount</th>
                              <th>Outstanding</th>
                              <th>Fine</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {defaulter.chalans.map((chalan) => (
                              <tr key={chalan.chalanId}>
                                <td>{chalan.chalanNumber}</td>
                                <td>
                                  {chalan.dueDate 
                                    ? new Date(chalan.dueDate).toLocaleDateString()
                                    : 'N/A'}
                                </td>
                                <td>{chalan.totalAmount.toLocaleString()}</td>
                                <td className="text-success">{chalan.totalPaid.toLocaleString()}</td>
                                <td className="text-danger">
                                  <strong>{chalan.totalDue.toLocaleString()}</strong>
                                </td>
                                <td>{chalan.fine > 0 ? chalan.fine.toLocaleString() : '-'}</td>
                                <td>{getStatusBadge(chalan.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FeeDefaulters;

