import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Tab, Card, Row, Col, Form, Button, Table, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../common/ModuleSidebar';

const gradientHeader = {
  background: 'var(--gradient-primary)',
  color: 'white',
  border: 'none'
};

const HostelDashboard = () => {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [residents, setResidents] = useState([]); // allocations
  const [payments, setPayments] = useState([]);

  const [roomForm, setRoomForm] = useState({ number: '', capacity: 2, type: 'standard', status: 'available' });
  const [allocationForm, setAllocationForm] = useState({ studentId: '', roomId: '', status: 'active' });
  const [paymentForm, setPaymentForm] = useState({ studentId: '', amount: '', month: '', status: 'unpaid' });
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [stuSnap, roomSnap, resSnap, paySnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role','==','student'))),
        getDocs(collection(db, 'hostelRooms')),
        getDocs(collection(db, 'hostelAllocations')),
        getDocs(collection(db, 'hostelPayments'))
      ]);
      setStudents(stuSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRooms(roomSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setResidents(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMessage('Error loading hostel data');
      setMessageType('danger');
    } finally { setLoading(false); }
  };

  const addRoom = async () => {
    if (!roomForm.number) { setMessage('Enter room number'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'hostelRooms'), {
        ...roomForm,
        capacity: Number(roomForm.capacity) || 0,
        createdAt: serverTimestamp()
      });
      setRoomForm({ number: '', capacity: 2, type: 'standard', status: 'available' });
      setMessage('Room added'); setMessageType('success'); loadAll();
    } catch(e){ setMessage('Failed to add room'); setMessageType('danger'); }
  };

  const addAllocation = async () => {
    if (!allocationForm.studentId || !allocationForm.roomId) { setMessage('Select student and room'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'hostelAllocations'), { ...allocationForm, createdAt: serverTimestamp() });
      setAllocationForm({ studentId: '', roomId: '', status: 'active' });
      setMessage('Allocation saved'); setMessageType('success'); loadAll();
    } catch(e){ setMessage('Failed to allocate'); setMessageType('danger'); }
  };

  const endAllocation = async (id) => {
    try { await updateDoc(doc(db, 'hostelAllocations', id), { status: 'ended', endedAt: serverTimestamp() }); setResidents(prev => prev.map(r => r.id===id?{...r, status:'ended'}:r)); }
    catch(e){ setMessage('Failed to update'); setMessageType('danger'); }
  };

  const deleteAllocation = async (id) => {
    try { await deleteDoc(doc(db, 'hostelAllocations', id)); setResidents(prev => prev.filter(r => r.id!==id)); }
    catch(e){ setMessage('Failed to delete'); setMessageType('danger'); }
  };

  const addPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amount || !paymentForm.month) { setMessage('Fill all payment fields'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'hostelPayments'), { ...paymentForm, amount: Number(paymentForm.amount)||0, createdAt: serverTimestamp() });
      setPaymentForm({ studentId: '', amount: '', month: '', status: 'unpaid' });
      setMessage('Payment recorded'); setMessageType('success'); loadAll();
    } catch(e){ setMessage('Failed to add payment'); setMessageType('danger'); }
  };

  const markPaymentPaid = async (id) => {
    try { await updateDoc(doc(db, 'hostelPayments', id), { status: 'paid', paidAt: serverTimestamp() }); setPayments(prev => prev.map(p => p.id===id?{...p, status:'paid'}:p)); }
    catch(e){ setMessage('Failed to update'); setMessageType('danger'); }
  };

  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch(e){} };

  const getStudentName = (id) => (students.find(s => s.id===id)?.name) || 'N/A';
  const getRoomNumber = (id) => (rooms.find(r => r.id===id)?.number) || 'N/A';

  // Report calculations
  const reportData = useMemo(() => {
    const filteredResidents = residents.filter(r => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const residentDate = r.createdAt?.toDate ? r.createdAt.toDate().toISOString().split('T')[0] : '';
      if (reportDateRange.start && residentDate < reportDateRange.start) return false;
      if (reportDateRange.end && residentDate > reportDateRange.end) return false;
      return true;
    });

    const filteredPayments = payments.filter(p => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const paymentDate = p.month || (p.createdAt?.toDate ? p.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && paymentDate < reportDateRange.start) return false;
      if (reportDateRange.end && paymentDate > reportDateRange.end) return false;
      return true;
    });

    const roomStats = {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
      occupied: filteredResidents.filter(r => r.status === 'active').length,
      utilization: rooms.length > 0 ? (filteredResidents.filter(r => r.status === 'active').length / rooms.length) * 100 : 0
    };

    const allocationStats = {
      total: filteredResidents.length,
      active: filteredResidents.filter(r => r.status === 'active').length,
      ended: filteredResidents.filter(r => r.status === 'ended').length,
      byType: {}
    };

    filteredResidents.forEach(r => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const roomType = room?.type || 'unknown';
      if (!allocationStats.byType[roomType]) {
        allocationStats.byType[roomType] = { total: 0, active: 0, ended: 0 };
      }
      allocationStats.byType[roomType].total++;
      if (r.status === 'active') allocationStats.byType[roomType].active++;
      else allocationStats.byType[roomType].ended++;
    });

    const paymentStats = {
      total: filteredPayments.length,
      paid: filteredPayments.filter(p => p.status === 'paid').length,
      unpaid: filteredPayments.filter(p => p.status !== 'paid').length,
      totalAmount: filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      paidAmount: filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      unpaidAmount: filteredPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    };

    const monthlyBreakdown = {};
    filteredPayments.forEach(p => {
      const month = p.month || 'unknown';
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { total: 0, paid: 0, unpaid: 0, amount: 0 };
      }
      monthlyBreakdown[month].total++;
      monthlyBreakdown[month].amount += Number(p.amount) || 0;
      if (p.status === 'paid') {
        monthlyBreakdown[month].paid++;
      } else {
        monthlyBreakdown[month].unpaid++;
      }
    });

    return {
      residents: filteredResidents,
      payments: filteredPayments,
      roomStats,
      allocationStats,
      paymentStats,
      monthlyBreakdown
    };
  }, [rooms, residents, payments, reportDateRange]);

  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'residents') {
      csvContent = 'Student,Room,Status,Allocation Date\n';
      reportData.residents.forEach(r => {
        const studentName = getStudentName(r.studentId);
        const roomNumber = getRoomNumber(r.roomId);
        const date = r.createdAt?.toDate ? r.createdAt.toDate().toISOString().split('T')[0] : '';
        csvContent += `${studentName},${roomNumber},${r.status || 'active'},${date}\n`;
      });
      filename = `hostel_residents_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'payments') {
      csvContent = 'Student,Amount,Month,Status,Paid Date\n';
      reportData.payments.forEach(p => {
        const studentName = getStudentName(p.studentId);
        const paidDate = p.paidAt?.toDate ? p.paidAt.toDate().toISOString().split('T')[0] : '';
        csvContent += `${studentName},${p.amount || 0},${p.month || ''},${p.status || 'unpaid'},${paidDate}\n`;
      });
      filename = `hostel_payments_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'rooms') {
      csvContent = 'Room Number,Type,Capacity,Status,Occupied\n';
      rooms.forEach(r => {
        const occupied = residents.filter(res => res.roomId === r.id && res.status === 'active').length;
        csvContent += `${r.number},${r.type || 'standard'},${r.capacity || 0},${r.status || 'available'},${occupied}\n`;
      });
      filename = `hostel_rooms_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Summary report
      csvContent = 'Report Type,Value\n';
      csvContent += `Total Rooms,${reportData.roomStats.total}\n`;
      csvContent += `Available Rooms,${reportData.roomStats.available}\n`;
      csvContent += `Maintenance Rooms,${reportData.roomStats.maintenance}\n`;
      csvContent += `Occupied Rooms,${reportData.roomStats.occupied}\n`;
      csvContent += `Room Utilization,${reportData.roomStats.utilization.toFixed(1)}%\n`;
      csvContent += `\nAllocation Statistics\n`;
      csvContent += `Total Allocations,${reportData.allocationStats.total}\n`;
      csvContent += `Active Allocations,${reportData.allocationStats.active}\n`;
      csvContent += `Ended Allocations,${reportData.allocationStats.ended}\n`;
      csvContent += `\nPayment Statistics\n`;
      csvContent += `Total Payments,${reportData.paymentStats.total}\n`;
      csvContent += `Paid Payments,${reportData.paymentStats.paid}\n`;
      csvContent += `Unpaid Payments,${reportData.paymentStats.unpaid}\n`;
      csvContent += `Total Amount,${reportData.paymentStats.totalAmount}\n`;
      csvContent += `Paid Amount,${reportData.paymentStats.paidAmount}\n`;
      csvContent += `Unpaid Amount,${reportData.paymentStats.unpaidAmount}\n`;
      filename = `hostel_summary_report_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setMessage('Report exported successfully');
    setMessageType('success');
  };

  const isAdminView = userRole === 'admin';

  return (
    <div className="d-flex min-vh-100">
      {!isAdminView && (
        <div className="sidebar-overlay" onClick={() => { const s=document.querySelector('.sidebar-enhanced'); const o=document.querySelector('.sidebar-overlay'); if (s&&o){s.classList.remove('show'); o.classList.remove('show');}}}></div>
      )}
      {!isAdminView && (
      <ModuleSidebar
        title="Hostel"
        onLogout={handleLogout}
        items={[
          { key: 'overview', label: 'Overview', icon: 'dashboard', onClick: () => setActiveTab('overview') },
          { key: 'rooms', label: 'Rooms', icon: 'meeting_room', onClick: () => setActiveTab('rooms') },
          { key: 'residents', label: 'Residents', icon: 'groups', onClick: () => setActiveTab('residents') },
          { key: 'allocations', label: 'Allocations', icon: 'how_to_reg', onClick: () => setActiveTab('allocations') },
          { key: 'payments', label: 'Payments', icon: 'account_balance_wallet', onClick: () => setActiveTab('payments') },
          { key: 'reports', label: 'Reports', icon: 'insights', onClick: () => setActiveTab('reports') }
        ]}
      />)}
      <div className="flex-grow-1 d-flex flex-column container-enhanced">
        {!isAdminView && (
          <div className="mb-2 d-mobile">
            <Button
              variant="light"
              className="border-0 shadow-sm rounded-3 p-2"
              onClick={() => { const s=document.querySelector('.sidebar-enhanced'); const o=document.querySelector('.sidebar-overlay'); if (s&&o){s.classList.add('show'); o.classList.add('show');}}}
              title="Open Menu"
              style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" stroke="#333" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Button>
          </div>
        )}
        <div className="mb-4">
          <h2 className="mb-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            <i className="fas fa-hotel me-3"></i>
            Hostel Management
          </h2>
          <p className="text-muted mb-0">Manage hostel rooms, residents, allocations and payments</p>
        </div>

        {message && (
          <Alert variant={messageType} className={`alert-enhanced alert-${messageType}`} onClose={() => setMessage('')} dismissible>
            {message}
          </Alert>
        )}

        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')} className="mb-4 nav-tabs-enhanced">
          <Tab eventKey="overview" title="Overview">
            <Row>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Rooms</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{rooms.length}</h3>
                    <small className="text-muted">Total rooms</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Active Residents</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{residents.filter(r=>r.status==='active').length}</h3>
                    <small className="text-muted">Currently allocated</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Payments</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{payments.filter(p=>p.status!=='paid').length}</h3>
                    <small className="text-muted">Pending payments</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="rooms" title="Rooms">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Add Room</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Room Number</Form.Label>
                        <Form.Control value={roomForm.number} onChange={(e)=>setRoomForm({...roomForm, number: e.target.value})} placeholder="e.g., A-101"/>
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Capacity</Form.Label>
                            <Form.Control type="number" value={roomForm.capacity} onChange={(e)=>setRoomForm({...roomForm, capacity: e.target.value})}/>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Type</Form.Label>
                            <Form.Select value={roomForm.type} onChange={(e)=>setRoomForm({...roomForm, type: e.target.value})}>
                              <option value="standard">Standard</option>
                              <option value="deluxe">Deluxe</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select value={roomForm.status} onChange={(e)=>setRoomForm({...roomForm, status: e.target.value})}>
                          <option value="available">Available</option>
                          <option value="maintenance">Maintenance</option>
                        </Form.Select>
                      </Form.Group>
                      <Button variant="success btn-enhanced" onClick={addRoom} disabled={loading}>
                        <i className="fas fa-plus me-2"></i>
                        Add Room
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Rooms List</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Number</th>
                          <th>Capacity</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(r => (
                          <tr key={r.id}>
                            <td>{r.number}</td>
                            <td>{r.capacity}</td>
                            <td>{r.type}</td>
                            <td><Badge bg={r.status==='available'?'success': 'warning'}>{r.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="residents" title="Residents">
            <Card className="card-enhanced">
              <Card.Header style={gradientHeader}><strong>Residents</strong></Card.Header>
              <Card.Body>
                <Table responsive striped bordered hover size="sm" className="table-enhanced">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Room</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map(r => (
                      <tr key={r.id}>
                        <td>{getStudentName(r.studentId)}</td>
                        <td>{getRoomNumber(r.roomId)}</td>
                        <td><Badge bg={r.status==='active'?'success':'secondary'}>{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>

          <Tab eventKey="allocations" title="Allocations">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Allocate Room</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Student</Form.Label>
                        <Form.Select value={allocationForm.studentId} onChange={(e)=>setAllocationForm({...allocationForm, studentId: e.target.value})}>
                          <option value="">Select student</option>
                          {students.map(s => (<option key={s.id} value={s.id}>{s.name} {s.rollNumber?`(${s.rollNumber})`:''}</option>))}
                        </Form.Select>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Room</Form.Label>
                        <Form.Select value={allocationForm.roomId} onChange={(e)=>setAllocationForm({...allocationForm, roomId: e.target.value})}>
                          <option value="">Select room</option>
                          {rooms.map(r => (<option key={r.id} value={r.id}>{r.number}</option>))}
                        </Form.Select>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select value={allocationForm.status} onChange={(e)=>setAllocationForm({...allocationForm, status: e.target.value})}>
                          <option value="active">Active</option>
                          <option value="ended">Ended</option>
                        </Form.Select>
                      </Form.Group>
                      <Button variant="success btn-enhanced" onClick={addAllocation} disabled={loading}>
                        <i className="fas fa-plus me-2"></i>
                        Save Allocation
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Allocations List</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Room</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residents.map(r => (
                          <tr key={r.id}>
                            <td>{getStudentName(r.studentId)}</td>
                            <td>{getRoomNumber(r.roomId)}</td>
                            <td><Badge bg={r.status==='active'?'success':'secondary'}>{r.status}</Badge></td>
                            <td className="d-flex gap-2">
                              {r.status==='active' && (
                                <Button size="sm" variant="outline-warning" onClick={()=>endAllocation(r.id)}>
                                  <i className="fas fa-stop"></i>
                                </Button>
                              )}
                              <Button size="sm" variant="outline-danger" onClick={()=>deleteAllocation(r.id)}>
                                <i className="fas fa-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="payments" title="Payments">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Add Payment</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Student</Form.Label>
                        <Form.Select value={paymentForm.studentId} onChange={(e)=>setPaymentForm({...paymentForm, studentId: e.target.value})}>
                          <option value="">Select student</option>
                          {students.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </Form.Select>
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Amount (PKR)</Form.Label>
                            <Form.Control type="number" value={paymentForm.amount} onChange={(e)=>setPaymentForm({...paymentForm, amount: e.target.value})}/>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Month</Form.Label>
                            <Form.Control value={paymentForm.month} onChange={(e)=>setPaymentForm({...paymentForm, month: e.target.value})} placeholder="e.g., 2025-11"/>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select value={paymentForm.status} onChange={(e)=>setPaymentForm({...paymentForm, status: e.target.value})}>
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </Form.Select>
                      </Form.Group>
                      <Button variant="success btn-enhanced" onClick={addPayment} disabled={loading}>
                        <i className="fas fa-plus me-2"></i>
                        Save Payment
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Payments List</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Amount</th>
                          <th>Month</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.id}>
                            <td>{getStudentName(p.studentId)}</td>
                            <td>PKR {(Number(p.amount)||0).toLocaleString()}</td>
                            <td>{p.month}</td>
                            <td><Badge bg={p.status==='paid'?'success':'warning'}>{p.status}</Badge></td>
                            <td>
                              {p.status!=='paid' && (
                                <Button size="sm" variant="outline-success" onClick={()=>markPaymentPaid(p.id)}>
                                  <i className="fas fa-check"></i>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="reports" title="Reports">
            <Row className="mb-3">
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Date Range Filter</strong></Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Start Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={reportDateRange.start}
                            onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>End Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={reportDateRange.end}
                            onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4} className="d-flex align-items-end">
                        <Button
                          variant="outline-secondary"
                          onClick={() => setReportDateRange({ start: '', end: '' })}
                          className="w-100"
                        >
                          <i className="fas fa-times me-2"></i>Clear Filter
                        </Button>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
                    <strong>Total Rooms</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{reportData.roomStats.total}</h4>
                    <small className="text-muted">All rooms</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                    <strong>Available</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{reportData.roomStats.available}</h4>
                    <small className="text-muted">Ready for allocation</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', color: 'white' }}>
                    <strong>Occupied</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{reportData.roomStats.occupied}</h4>
                    <small className="text-muted">Currently allocated</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}>
                    <strong>Utilization</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{reportData.roomStats.utilization.toFixed(1)}%</h4>
                    <ProgressBar
                      variant={reportData.roomStats.utilization >= 80 ? 'success' : reportData.roomStats.utilization >= 50 ? 'warning' : 'info'}
                      now={reportData.roomStats.utilization}
                      className="mt-2"
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Allocation Statistics</strong></Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted">Total Allocations</small>
                          <h5>{reportData.allocationStats.total}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Active</small>
                          <h5 className="text-success">{reportData.allocationStats.active}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Ended</small>
                          <h5 className="text-secondary">{reportData.allocationStats.ended}</h5>
                        </div>
                      </Col>
                      <Col md={6}>
                        {reportData.allocationStats.total > 0 && (
                          <div className="mt-3">
                            <small className="text-muted">Active Rate</small>
                            <ProgressBar
                              variant="success"
                              now={(reportData.allocationStats.active / reportData.allocationStats.total) * 100}
                              className="mt-1"
                              label={`${((reportData.allocationStats.active / reportData.allocationStats.total) * 100).toFixed(1)}%`}
                            />
                          </div>
                        )}
                        {Object.keys(reportData.allocationStats.byType).length > 0 && (
                          <div className="mt-3">
                            <small className="text-muted d-block mb-2">By Room Type</small>
                            {Object.entries(reportData.allocationStats.byType).map(([type, data]) => (
                              <div key={type} className="mb-2">
                                <small><strong>{type}:</strong> {data.active} active, {data.ended} ended</small>
                              </div>
                            ))}
                          </div>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Payment Statistics</strong></Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted">Total Payments</small>
                          <h5>{reportData.paymentStats.total}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Paid</small>
                          <h5 className="text-success">{reportData.paymentStats.paid}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Unpaid</small>
                          <h5 className="text-warning">{reportData.paymentStats.unpaid}</h5>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted">Total Amount</small>
                          <h5>PKR {reportData.paymentStats.totalAmount.toLocaleString()}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Paid Amount</small>
                          <h5 className="text-success">PKR {reportData.paymentStats.paidAmount.toLocaleString()}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Outstanding</small>
                          <h5 className="text-warning">PKR {reportData.paymentStats.unpaidAmount.toLocaleString()}</h5>
                        </div>
                      </Col>
                    </Row>
                    {reportData.paymentStats.total > 0 && (
                      <div className="mt-3">
                        <small className="text-muted">Payment Rate</small>
                        <ProgressBar
                          variant="success"
                          now={(reportData.paymentStats.paid / reportData.paymentStats.total) * 100}
                          className="mt-1"
                          label={`${((reportData.paymentStats.paid / reportData.paymentStats.total) * 100).toFixed(1)}%`}
                        />
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}>
                    <div className="d-flex justify-content-between align-items-center">
                      <strong>Monthly Payment Breakdown</strong>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {Object.keys(reportData.monthlyBreakdown).length === 0 ? (
                      <p className="text-muted mb-0">No payments in selected period</p>
                    ) : (
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Total Payments</th>
                            <th>Paid</th>
                            <th>Unpaid</th>
                            <th>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.monthlyBreakdown).map(([month, data]) => (
                            <tr key={month}>
                              <td><strong>{month}</strong></td>
                              <td>{data.total}</td>
                              <td className="text-success">{data.paid}</td>
                              <td className="text-warning">{data.unpaid}</td>
                              <td>PKR {data.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}>
                    <div className="d-flex justify-content-between align-items-center">
                      <strong>Export Reports</strong>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('summary')}>
                          <i className="fas fa-file-csv me-2"></i>Summary
                        </Button>
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('rooms')}>
                          <i className="fas fa-file-csv me-2"></i>Rooms
                        </Button>
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('residents')}>
                          <i className="fas fa-file-csv me-2"></i>Residents
                        </Button>
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('payments')}>
                          <i className="fas fa-file-csv me-2"></i>Payments
                        </Button>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Export reports as CSV files. Select a date range above to filter the data before exporting.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Room Status Details</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Room Number</th>
                          <th>Type</th>
                          <th>Capacity</th>
                          <th>Status</th>
                          <th>Occupied</th>
                          <th>Vacancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(r => {
                          const occupied = residents.filter(res => res.roomId === r.id && res.status === 'active').length;
                          const vacancy = (r.capacity || 0) - occupied;
                          return (
                            <tr key={r.id}>
                              <td><strong>{r.number}</strong></td>
                              <td>{r.type || 'standard'}</td>
                              <td>{r.capacity || 0}</td>
                              <td><Badge bg={r.status === 'available' ? 'success' : 'warning'}>{r.status || 'available'}</Badge></td>
                              <td>{occupied}</td>
                              <td className={vacancy === 0 ? 'text-danger' : vacancy === r.capacity ? 'text-success' : 'text-warning'}>
                                {vacancy} / {r.capacity || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default HostelDashboard;
