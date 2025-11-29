import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Tab, Card, Row, Col, Form, Button, Table, Alert, Badge, Spinner, ProgressBar } from 'react-bootstrap';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../common/ModuleSidebar';

const gradientHeader = {
  background: 'var(--gradient-primary)',
  color: 'white',
  border: 'none'
};

const TransportDashboard = () => {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);

  const [vehicleForm, setVehicleForm] = useState({ number: '', model: '', capacity: 40, status: 'active' });
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', licenseNo: '', status: 'active' });
  const [routeForm, setRouteForm] = useState({ title: '', startPoint: '', endPoint: '', stops: '' });
  const [assignmentForm, setAssignmentForm] = useState({ studentId: '', vehicleId: '', driverId: '', routeId: '', status: 'active' });
  const [tripForm, setTripForm] = useState({ vehicleId: '', driverId: '', routeId: '', date: '', tripType: 'morning', status: 'completed', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ studentId: '', assignmentId: '', amount: '', month: '', paymentDate: '', status: 'paid', notes: '' });
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [vehSnap, driSnap, rouSnap, asgSnap, tripSnap, paySnap, stuSnap] = await Promise.all([
        getDocs(collection(db, 'transportVehicles')),
        getDocs(collection(db, 'transportDrivers')),
        getDocs(collection(db, 'transportRoutes')),
        getDocs(collection(db, 'transportAssignments')),
        getDocs(collection(db, 'transportTrips')),
        getDocs(collection(db, 'transportPayments')),
        getDocs(query(collection(db, 'users'), where('role','==','student')))
      ]);

      setVehicles(vehSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDrivers(driSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRoutes(rouSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAssignments(asgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTrips(tripSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStudents(stuSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMessage('Error loading transport data');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async () => {
    if (!vehicleForm.number) return;
    try {
      await addDoc(collection(db, 'transportVehicles'), {
        ...vehicleForm,
        capacity: Number(vehicleForm.capacity) || 0,
        createdAt: serverTimestamp()
      });
      setVehicleForm({ number: '', model: '', capacity: 40, status: 'active' });
      setMessage('Vehicle added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add vehicle');
      setMessageType('danger');
    }
  };

  const addDriver = async () => {
    if (!driverForm.name) return;
    try {
      await addDoc(collection(db, 'transportDrivers'), {
        ...driverForm,
        createdAt: serverTimestamp()
      });
      setDriverForm({ name: '', phone: '', licenseNo: '', status: 'active' });
      setMessage('Driver added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add driver');
      setMessageType('danger');
    }
  };

  const addRoute = async () => {
    if (!routeForm.title) return;
    try {
      const stops = routeForm.stops
        ? routeForm.stops.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      await addDoc(collection(db, 'transportRoutes'), {
        title: routeForm.title,
        startPoint: routeForm.startPoint,
        endPoint: routeForm.endPoint,
        stops,
        createdAt: serverTimestamp()
      });
      setRouteForm({ title: '', startPoint: '', endPoint: '', stops: '' });
      setMessage('Route added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add route');
      setMessageType('danger');
    }
  };

  const addAssignment = async () => {
    if (!assignmentForm.studentId || !assignmentForm.vehicleId || !assignmentForm.driverId || !assignmentForm.routeId) {
      setMessage('Please select student, vehicle, driver, and route');
      setMessageType('warning');
      return;
    }
    try {
      await addDoc(collection(db, 'transportAssignments'), {
        ...assignmentForm,
        createdAt: serverTimestamp()
      });
      setAssignmentForm({ studentId: '', vehicleId: '', driverId: '', routeId: '', status: 'active' });
      setMessage('Assignment added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add assignment');
      setMessageType('danger');
    }
  };

  const deleteAssignment = async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'transportAssignments', id));
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      setMessage('Failed to delete assignment');
      setMessageType('danger');
    }
  };

  const addTrip = async () => {
    if (!tripForm.vehicleId || !tripForm.driverId || !tripForm.routeId || !tripForm.date) {
      setMessage('Please fill all required fields');
      setMessageType('warning');
      return;
    }
    try {
      await addDoc(collection(db, 'transportTrips'), {
        ...tripForm,
        createdAt: serverTimestamp()
      });
      setTripForm({ vehicleId: '', driverId: '', routeId: '', date: '', tripType: 'morning', status: 'completed', notes: '' });
      setMessage('Trip logged successfully');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to log trip');
      setMessageType('danger');
    }
  };

  const deleteTrip = async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'transportTrips', id));
      setTrips(prev => prev.filter(t => t.id !== id));
      setMessage('Trip deleted successfully');
      setMessageType('success');
    } catch (e) {
      setMessage('Failed to delete trip');
      setMessageType('danger');
    }
  };

  const addPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amount || !paymentForm.month) {
      setMessage('Please fill all required fields');
      setMessageType('warning');
      return;
    }
    try {
      await addDoc(collection(db, 'transportPayments'), {
        ...paymentForm,
        amount: Number(paymentForm.amount) || 0,
        createdAt: serverTimestamp()
      });
      setPaymentForm({ studentId: '', assignmentId: '', amount: '', month: '', paymentDate: '', status: 'paid', notes: '' });
      setMessage('Payment recorded successfully');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to record payment');
      setMessageType('danger');
    }
  };

  const markPaymentUnpaid = async (id) => {
    try {
      await updateDoc(doc(db, 'transportPayments', id), { status: 'unpaid' });
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'unpaid' } : p));
      setMessage('Payment status updated');
      setMessageType('success');
    } catch (e) {
      setMessage('Failed to update payment');
      setMessageType('danger');
    }
  };

  const deletePayment = async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'transportPayments', id));
      setPayments(prev => prev.filter(p => p.id !== id));
      setMessage('Payment deleted successfully');
      setMessageType('success');
    } catch (e) {
      setMessage('Failed to delete payment');
      setMessageType('danger');
    }
  };

  const lookupName = (id, list, key) => {
    const found = list.find(x => x.id === id);
    if (!found) return 'N/A';
    return key ? (found[key] || 'N/A') : (found.name || found.title || found.number || 'N/A');
  };

  // Report calculations
  const reportData = useMemo(() => {
    const filteredTrips = trips.filter(t => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const tripDate = t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && tripDate < reportDateRange.start) return false;
      if (reportDateRange.end && tripDate > reportDateRange.end) return false;
      return true;
    });

    const filteredPayments = payments.filter(p => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const paymentDate = p.paymentDate || p.month || (p.createdAt?.toDate ? p.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && paymentDate < reportDateRange.start) return false;
      if (reportDateRange.end && paymentDate > reportDateRange.end) return false;
      return true;
    });

    const vehicleStats = {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === 'active').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      inactive: vehicles.filter(v => v.status === 'inactive').length,
      tripsCount: {}
    };

    filteredTrips.forEach(t => {
      if (!vehicleStats.tripsCount[t.vehicleId]) {
        vehicleStats.tripsCount[t.vehicleId] = 0;
      }
      vehicleStats.tripsCount[t.vehicleId]++;
    });

    const driverStats = {
      total: drivers.length,
      active: drivers.filter(d => d.status === 'active').length,
      onLeave: drivers.filter(d => d.status === 'on_leave').length,
      tripsCount: {}
    };

    filteredTrips.forEach(t => {
      if (!driverStats.tripsCount[t.driverId]) {
        driverStats.tripsCount[t.driverId] = 0;
      }
      driverStats.tripsCount[t.driverId]++;
    });

    const tripStats = {
      total: filteredTrips.length,
      completed: filteredTrips.filter(t => t.status === 'completed').length,
      delayed: filteredTrips.filter(t => t.status === 'delayed').length,
      cancelled: filteredTrips.filter(t => t.status === 'cancelled').length,
      byType: {
        morning: filteredTrips.filter(t => t.tripType === 'morning').length,
        afternoon: filteredTrips.filter(t => t.tripType === 'afternoon').length,
        evening: filteredTrips.filter(t => t.tripType === 'evening').length
      },
      byRoute: {}
    };

    filteredTrips.forEach(t => {
      if (!tripStats.byRoute[t.routeId]) {
        tripStats.byRoute[t.routeId] = 0;
      }
      tripStats.byRoute[t.routeId]++;
    });

    const paymentStats = {
      total: filteredPayments.length,
      paid: filteredPayments.filter(p => p.status === 'paid').length,
      unpaid: filteredPayments.filter(p => p.status !== 'paid').length,
      totalAmount: filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      paidAmount: filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      unpaidAmount: filteredPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    };

    const monthlyPayments = {};
    filteredPayments.forEach(p => {
      const month = p.month || 'unknown';
      if (!monthlyPayments[month]) {
        monthlyPayments[month] = { total: 0, paid: 0, unpaid: 0, amount: 0 };
      }
      monthlyPayments[month].total++;
      monthlyPayments[month].amount += Number(p.amount) || 0;
      if (p.status === 'paid') {
        monthlyPayments[month].paid++;
      } else {
        monthlyPayments[month].unpaid++;
      }
    });

    const assignmentStats = {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active').length,
      inactive: assignments.filter(a => a.status === 'inactive').length
    };

    return {
      trips: filteredTrips,
      payments: filteredPayments,
      vehicleStats,
      driverStats,
      tripStats,
      paymentStats,
      monthlyPayments,
      assignmentStats
    };
  }, [vehicles, drivers, trips, payments, assignments, reportDateRange]);

  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'trips') {
      csvContent = 'Date,Vehicle,Driver,Route,Type,Status,Notes\n';
      reportData.trips.forEach(t => {
        const vehicleName = lookupName(t.vehicleId, vehicles, 'number');
        const driverName = lookupName(t.driverId, drivers, 'name');
        const routeName = lookupName(t.routeId, routes, 'title');
        csvContent += `${t.date || ''},${vehicleName},${driverName},${routeName},${t.tripType || 'morning'},${t.status || 'completed'},"${(t.notes || '').replace(/"/g, '""')}"\n`;
      });
      filename = `transport_trips_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'payments') {
      csvContent = 'Student,Amount,Month,Payment Date,Status,Notes\n';
      reportData.payments.forEach(p => {
        const studentName = lookupName(p.studentId, students, 'name');
        csvContent += `${studentName},${p.amount || 0},${p.month || ''},${p.paymentDate || ''},${p.status || 'unpaid'},"${(p.notes || '').replace(/"/g, '""')}"\n`;
      });
      filename = `transport_payments_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'vehicles') {
      csvContent = 'Vehicle Number,Model,Capacity,Status,Trips Count\n';
      vehicles.forEach(v => {
        const tripsCount = reportData.vehicleStats.tripsCount[v.id] || 0;
        csvContent += `${v.number},${v.model || ''},${v.capacity || 0},${v.status || 'active'},${tripsCount}\n`;
      });
      filename = `transport_vehicles_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Summary report
      csvContent = 'Report Type,Value\n';
      csvContent += `Total Vehicles,${reportData.vehicleStats.total}\n`;
      csvContent += `Active Vehicles,${reportData.vehicleStats.active}\n`;
      csvContent += `Maintenance Vehicles,${reportData.vehicleStats.maintenance}\n`;
      csvContent += `Total Drivers,${reportData.driverStats.total}\n`;
      csvContent += `Active Drivers,${reportData.driverStats.active}\n`;
      csvContent += `Total Trips,${reportData.tripStats.total}\n`;
      csvContent += `Completed Trips,${reportData.tripStats.completed}\n`;
      csvContent += `Delayed Trips,${reportData.tripStats.delayed}\n`;
      csvContent += `Cancelled Trips,${reportData.tripStats.cancelled}\n`;
      csvContent += `Total Assignments,${reportData.assignmentStats.total}\n`;
      csvContent += `Active Assignments,${reportData.assignmentStats.active}\n`;
      csvContent += `\nPayment Statistics\n`;
      csvContent += `Total Payments,${reportData.paymentStats.total}\n`;
      csvContent += `Paid Payments,${reportData.paymentStats.paid}\n`;
      csvContent += `Unpaid Payments,${reportData.paymentStats.unpaid}\n`;
      csvContent += `Total Amount,${reportData.paymentStats.totalAmount}\n`;
      csvContent += `Paid Amount,${reportData.paymentStats.paidAmount}\n`;
      csvContent += `Unpaid Amount,${reportData.paymentStats.unpaidAmount}\n`;
      filename = `transport_summary_report_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setMessage('Report exported successfully');
    setMessageType('success');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      setMessage('Logout failed. Please try again.');
      setMessageType('danger');
    }
  };

  const isAdminView = userRole === 'admin';

  return (
    <div className="d-flex min-vh-100">
      {!isAdminView && (
        <div className="sidebar-overlay" onClick={() => { const s=document.querySelector('.sidebar-enhanced'); const o=document.querySelector('.sidebar-overlay'); if (s&&o){s.classList.remove('show'); o.classList.remove('show');}}}></div>
      )}
      {!isAdminView && (
      <ModuleSidebar
        title="Transport"
        onLogout={handleLogout}
        items={[
          { key: 'overview', label: 'Overview', icon: 'dashboard', onClick: () => setActiveTab('overview') },
          { key: 'vehicles', label: 'Vehicles', icon: 'local_shipping', onClick: () => setActiveTab('vehicles') },
          { key: 'drivers', label: 'Drivers', icon: 'badge', onClick: () => setActiveTab('drivers') },
          { key: 'routes', label: 'Routes', icon: 'alt_route', onClick: () => setActiveTab('routes') },
          { key: 'assignments', label: 'Assignments', icon: 'assignment_ind', onClick: () => setActiveTab('assignments') },
          { key: 'trips', label: 'Trips', icon: 'schedule', onClick: () => setActiveTab('trips') },
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
          <i className="fas fa-bus me-3"></i>
          Transport Management
        </h2>
        <p className="text-muted mb-0">Manage vehicles, drivers, routes, assignments, trips, and payments</p>
        </div>

      {message && (
        <Alert variant={messageType} className={`alert-enhanced alert-${messageType}`} onClose={() => setMessage('')} dismissible>
          {message}
        </Alert>
      )}

      <Row>
        <Col md={12}>
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')} className="mb-4 nav-tabs-enhanced">
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={4}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Vehicles</strong></Card.Header>
                <Card.Body>
                  <h3 className="mb-0">{vehicles.length}</h3>
                  <small className="text-muted">Total vehicles</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Drivers</strong></Card.Header>
                <Card.Body>
                  <h3 className="mb-0">{drivers.length}</h3>
                  <small className="text-muted">Total drivers</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Routes</strong></Card.Header>
                <Card.Body>
                  <h3 className="mb-0">{routes.length}</h3>
                  <small className="text-muted">Active routes</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="vehicles" title="Vehicles">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Add Vehicle</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Vehicle Number</Form.Label>
                      <Form.Control value={vehicleForm.number} onChange={(e)=>setVehicleForm({...vehicleForm, number: e.target.value})} placeholder="e.g., ABC-1234"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Model</Form.Label>
                      <Form.Control value={vehicleForm.model} onChange={(e)=>setVehicleForm({...vehicleForm, model: e.target.value})} placeholder="e.g., Toyota Coaster"/>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Capacity</Form.Label>
                          <Form.Control type="number" value={vehicleForm.capacity} onChange={(e)=>setVehicleForm({...vehicleForm, capacity: e.target.value})}/>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Status</Form.Label>
                          <Form.Select value={vehicleForm.status} onChange={(e)=>setVehicleForm({...vehicleForm, status: e.target.value})}>
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Button variant="success btn-enhanced" onClick={addVehicle} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Add Vehicle
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Vehicles List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Model</th>
                        <th>Capacity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map(v => (
                        <tr key={v.id}>
                          <td>{v.number}</td>
                          <td>{v.model}</td>
                          <td>{v.capacity}</td>
                          <td><Badge bg={v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'secondary'}>{v.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="drivers" title="Drivers">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Add Driver</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control value={driverForm.name} onChange={(e)=>setDriverForm({...driverForm, name: e.target.value})} placeholder="Driver name"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control value={driverForm.phone} onChange={(e)=>setDriverForm({...driverForm, phone: e.target.value})} placeholder="e.g., +92XXXXXXXX"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>License No</Form.Label>
                      <Form.Control value={driverForm.licenseNo} onChange={(e)=>setDriverForm({...driverForm, licenseNo: e.target.value})} placeholder="License number"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={driverForm.status} onChange={(e)=>setDriverForm({...driverForm, status: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                      </Form.Select>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addDriver} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Add Driver
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Drivers List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>License</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map(d => (
                        <tr key={d.id}>
                          <td>{d.name}</td>
                          <td>{d.phone}</td>
                          <td>{d.licenseNo}</td>
                          <td><Badge bg={d.status === 'active' ? 'success' : d.status === 'on_leave' ? 'warning' : 'secondary'}>{d.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="routes" title="Routes">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Add Route</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Route Title</Form.Label>
                      <Form.Control value={routeForm.title} onChange={(e)=>setRouteForm({...routeForm, title: e.target.value})} placeholder="e.g., North Zone - Morning"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Point</Form.Label>
                      <Form.Control value={routeForm.startPoint} onChange={(e)=>setRouteForm({...routeForm, startPoint: e.target.value})} placeholder="e.g., Main Depot"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>End Point</Form.Label>
                      <Form.Control value={routeForm.endPoint} onChange={(e)=>setRouteForm({...routeForm, endPoint: e.target.value})} placeholder="e.g., School Gate A"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Stops (comma separated)</Form.Label>
                      <Form.Control value={routeForm.stops} onChange={(e)=>setRouteForm({...routeForm, stops: e.target.value})} placeholder="Stop1, Stop2, Stop3"/>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addRoute} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Add Route
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Routes List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Stops</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map(r => (
                        <tr key={r.id}>
                          <td>{r.title}</td>
                          <td>{r.startPoint}</td>
                          <td>{r.endPoint}</td>
                          <td>{Array.isArray(r.stops) ? r.stops.join(', ') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="assignments" title="Assignments">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Add Assignment</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Student</Form.Label>
                      <Form.Select value={assignmentForm.studentId} onChange={(e)=>setAssignmentForm({...assignmentForm, studentId: e.target.value})}>
                        <option value="">Select a student</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Vehicle</Form.Label>
                      <Form.Select value={assignmentForm.vehicleId} onChange={(e)=>setAssignmentForm({...assignmentForm, vehicleId: e.target.value})}>
                        <option value="">Select a vehicle</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.number} - {v.model}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Driver</Form.Label>
                      <Form.Select value={assignmentForm.driverId} onChange={(e)=>setAssignmentForm({...assignmentForm, driverId: e.target.value})}>
                        <option value="">Select a driver</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Route</Form.Label>
                      <Form.Select value={assignmentForm.routeId} onChange={(e)=>setAssignmentForm({...assignmentForm, routeId: e.target.value})}>
                        <option value="">Select a route</option>
                        {routes.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={assignmentForm.status} onChange={(e)=>setAssignmentForm({...assignmentForm, status: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Form.Select>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addAssignment} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Add Assignment
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Assignments List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Route</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(a => (
                        <tr key={a.id}>
                          <td>{lookupName(a.studentId, students, 'name')}</td>
                          <td>{lookupName(a.vehicleId, vehicles, 'number')}</td>
                          <td>{lookupName(a.driverId, drivers, 'name')}</td>
                          <td>{lookupName(a.routeId, routes, 'title')}</td>
                          <td><Badge bg={a.status === 'active' ? 'success' : 'secondary'}>{a.status || 'active'}</Badge></td>
                          <td>
                            <Button size="sm" variant="outline-danger" onClick={()=>deleteAssignment(a.id)}>
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

        <Tab eventKey="trips" title="Trips">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Log Trip</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Vehicle *</Form.Label>
                      <Form.Select value={tripForm.vehicleId} onChange={(e)=>setTripForm({...tripForm, vehicleId: e.target.value})}>
                        <option value="">Select a vehicle</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.number} - {v.model}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Driver *</Form.Label>
                      <Form.Select value={tripForm.driverId} onChange={(e)=>setTripForm({...tripForm, driverId: e.target.value})}>
                        <option value="">Select a driver</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Route *</Form.Label>
                      <Form.Select value={tripForm.routeId} onChange={(e)=>setTripForm({...tripForm, routeId: e.target.value})}>
                        <option value="">Select a route</option>
                        {routes.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date *</Form.Label>
                          <Form.Control type="date" value={tripForm.date} onChange={(e)=>setTripForm({...tripForm, date: e.target.value})}/>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Trip Type</Form.Label>
                          <Form.Select value={tripForm.tripType} onChange={(e)=>setTripForm({...tripForm, tripType: e.target.value})}>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={tripForm.status} onChange={(e)=>setTripForm({...tripForm, status: e.target.value})}>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                        <option value="cancelled">Cancelled</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control as="textarea" rows={3} value={tripForm.notes} onChange={(e)=>setTripForm({...tripForm, notes: e.target.value})} placeholder="Optional notes about the trip"/>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addTrip} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Log Trip
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Trips List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Route</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map(t => (
                        <tr key={t.id}>
                          <td>{t.date || 'N/A'}</td>
                          <td>{lookupName(t.vehicleId, vehicles, 'number')}</td>
                          <td>{lookupName(t.driverId, drivers, 'name')}</td>
                          <td>{lookupName(t.routeId, routes, 'title')}</td>
                          <td><Badge bg="info">{t.tripType || 'morning'}</Badge></td>
                          <td>
                            <Badge bg={
                              t.status === 'completed' ? 'success' :
                              t.status === 'delayed' ? 'warning' : 'danger'
                            }>
                              {t.status || 'completed'}
                            </Badge>
                          </td>
                          <td>
                            <Button size="sm" variant="outline-danger" onClick={()=>deleteTrip(t.id)}>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {trips.length === 0 && (
                    <p className="text-muted text-center mb-0 mt-3">No trips logged yet</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="payments" title="Payments">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Record Payment</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Student *</Form.Label>
                      <Form.Select value={paymentForm.studentId} onChange={(e)=>setPaymentForm({...paymentForm, studentId: e.target.value})}>
                        <option value="">Select a student</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Assignment (Optional)</Form.Label>
                      <Form.Select value={paymentForm.assignmentId} onChange={(e)=>setPaymentForm({...paymentForm, assignmentId: e.target.value})}>
                        <option value="">Select an assignment (optional)</option>
                        {assignments.filter(a => a.studentId === paymentForm.studentId).map(a => (
                          <option key={a.id} value={a.id}>
                            {lookupName(a.vehicleId, vehicles, 'number')} - {lookupName(a.routeId, routes, 'title')}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Amount (PKR) *</Form.Label>
                          <Form.Control type="number" value={paymentForm.amount} onChange={(e)=>setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="0"/>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Month *</Form.Label>
                          <Form.Control type="month" value={paymentForm.month} onChange={(e)=>setPaymentForm({...paymentForm, month: e.target.value})}/>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Payment Date</Form.Label>
                          <Form.Control type="date" value={paymentForm.paymentDate} onChange={(e)=>setPaymentForm({...paymentForm, paymentDate: e.target.value})}/>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Status</Form.Label>
                          <Form.Select value={paymentForm.status} onChange={(e)=>setPaymentForm({...paymentForm, status: e.target.value})}>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control as="textarea" rows={3} value={paymentForm.notes} onChange={(e)=>setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Optional payment notes"/>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addPayment} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Record Payment
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
                        <th>Payment Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td>{lookupName(p.studentId, students, 'name')}</td>
                          <td>PKR {(Number(p.amount) || 0).toLocaleString()}</td>
                          <td>{p.month || 'N/A'}</td>
                          <td>{p.paymentDate || 'N/A'}</td>
                          <td>
                            <Badge bg={p.status === 'paid' ? 'success' : 'warning'}>
                              {p.status || 'unpaid'}
                            </Badge>
                          </td>
                          <td className="d-flex gap-2">
                            {p.status === 'paid' && (
                              <Button size="sm" variant="outline-warning" onClick={()=>markPaymentUnpaid(p.id)} title="Mark as Unpaid">
                                <i className="fas fa-times"></i>
                              </Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={()=>deletePayment(p.id)}>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {payments.length === 0 && (
                    <p className="text-muted text-center mb-0 mt-3">No payments recorded yet</p>
                  )}
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
                  <strong>Total Vehicles</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.vehicleStats.total}</h4>
                  <small className="text-muted">All vehicles</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                  <strong>Active Vehicles</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.vehicleStats.active}</h4>
                  <small className="text-muted">In service</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={{ background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', color: 'white' }}>
                  <strong>Total Trips</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.tripStats.total}</h4>
                  <small className="text-muted">Period trips</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}>
                  <strong>Trip Success Rate</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">
                    {reportData.tripStats.total > 0 
                      ? `${((reportData.tripStats.completed / reportData.tripStats.total) * 100).toFixed(1)}%`
                      : '0%'}
                  </h4>
                  <ProgressBar
                    variant={reportData.tripStats.total > 0 && (reportData.tripStats.completed / reportData.tripStats.total) >= 0.8 ? 'success' : 'warning'}
                    now={reportData.tripStats.total > 0 ? (reportData.tripStats.completed / reportData.tripStats.total) * 100 : 0}
                    className="mt-2"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Trip Statistics</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Trips</small>
                        <h5>{reportData.tripStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Completed</small>
                        <h5 className="text-success">{reportData.tripStats.completed}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Delayed</small>
                        <h5 className="text-warning">{reportData.tripStats.delayed}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Cancelled</small>
                        <h5 className="text-danger">{reportData.tripStats.cancelled}</h5>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted d-block mb-2">By Trip Type</small>
                        <div className="mb-2">
                          <small><strong>Morning:</strong> {reportData.tripStats.byType.morning}</small>
                        </div>
                        <div className="mb-2">
                          <small><strong>Afternoon:</strong> {reportData.tripStats.byType.afternoon}</small>
                        </div>
                        <div className="mb-2">
                          <small><strong>Evening:</strong> {reportData.tripStats.byType.evening}</small>
                        </div>
                      </div>
                      {reportData.tripStats.total > 0 && (
                        <div className="mt-3">
                          <small className="text-muted">Completion Rate</small>
                          <ProgressBar
                            variant="success"
                            now={(reportData.tripStats.completed / reportData.tripStats.total) * 100}
                            className="mt-1"
                            label={`${((reportData.tripStats.completed / reportData.tripStats.total) * 100).toFixed(1)}%`}
                          />
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
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Vehicle & Driver Stats</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Vehicles</small>
                        <h5>{reportData.vehicleStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Active</small>
                        <h5 className="text-success">{reportData.vehicleStats.active}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Maintenance</small>
                        <h5 className="text-warning">{reportData.vehicleStats.maintenance}</h5>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Drivers</small>
                        <h5>{reportData.driverStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Active</small>
                        <h5 className="text-success">{reportData.driverStats.active}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">On Leave</small>
                        <h5 className="text-warning">{reportData.driverStats.onLeave}</h5>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Assignment Statistics</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Assignments</small>
                        <h5>{reportData.assignmentStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Active</small>
                        <h5 className="text-success">{reportData.assignmentStats.active}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Inactive</small>
                        <h5 className="text-secondary">{reportData.assignmentStats.inactive}</h5>
                      </div>
                    </Col>
                    <Col md={6}>
                      {reportData.assignmentStats.total > 0 && (
                        <div className="mt-3">
                          <small className="text-muted">Active Rate</small>
                          <ProgressBar
                            variant="success"
                            now={(reportData.assignmentStats.active / reportData.assignmentStats.total) * 100}
                            className="mt-1"
                            label={`${((reportData.assignmentStats.active / reportData.assignmentStats.total) * 100).toFixed(1)}%`}
                          />
                        </div>
                      )}
                    </Col>
                  </Row>
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
                  {Object.keys(reportData.monthlyPayments).length === 0 ? (
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
                        {Object.entries(reportData.monthlyPayments).map(([month, data]) => (
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
                      <Button size="sm" variant="outline-light" onClick={() => exportToCSV('vehicles')}>
                        <i className="fas fa-file-csv me-2"></i>Vehicles
                      </Button>
                      <Button size="sm" variant="outline-light" onClick={() => exportToCSV('trips')}>
                        <i className="fas fa-file-csv me-2"></i>Trips
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
                <Card.Header style={gradientHeader}><strong>Top Vehicles by Trips</strong></Card.Header>
                <Card.Body>
                  {Object.keys(reportData.vehicleStats.tripsCount).length === 0 ? (
                    <p className="text-muted mb-0">No trips recorded in selected period</p>
                  ) : (
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th>Model</th>
                          <th>Status</th>
                          <th>Trips Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles
                          .filter(v => reportData.vehicleStats.tripsCount[v.id])
                          .sort((a, b) => (reportData.vehicleStats.tripsCount[b.id] || 0) - (reportData.vehicleStats.tripsCount[a.id] || 0))
                          .slice(0, 10)
                          .map(v => (
                            <tr key={v.id}>
                              <td><strong>{v.number}</strong></td>
                              <td>{v.model || 'N/A'}</td>
                              <td><Badge bg={v.status === 'active' ? 'success' : 'warning'}>{v.status || 'active'}</Badge></td>
                              <td>{reportData.vehicleStats.tripsCount[v.id] || 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
        </Col>
      </Row>
      </div>
    </div>
  );
};

export default TransportDashboard;


