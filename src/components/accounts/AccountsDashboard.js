import React, { useEffect, useState, useMemo } from 'react';
import { Navbar, Tabs, Tab, Card, Row, Col, Form, Button, Table, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../common/ModuleSidebar';
import FeeChalan from '../admin/FeeChalan';

const gradientHeader = {
  background: 'var(--gradient-primary)',
  color: 'white',
  border: 'none'
};

const AccountsDashboard = () => {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]); // income/expense
  const [invoices, setInvoices] = useState([]);
  const [chalans, setChalans] = useState([]);

  const [txnForm, setTxnForm] = useState({ type: 'income', category: 'fee', amount: '', date: '', description: '' });
  const [invoiceForm, setInvoiceForm] = useState({ studentId: '', amount: '', dueDate: '', status: 'unpaid' });
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [stuSnap, txnSnap, invSnap, chSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role','==','student'))),
        getDocs(collection(db, 'accountsTransactions')),
        getDocs(collection(db, 'accountsInvoices')),
        getDocs(collection(db, 'feeChalans'))
      ]);
      setStudents(stuSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTransactions(txnSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setChalans(chSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMessage('Error loading accounts data');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async () => {
    if (!txnForm.amount) { setMessage('Please enter amount'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'accountsTransactions'), {
        ...txnForm,
        amount: Number(txnForm.amount) || 0,
        createdAt: serverTimestamp()
      });
      setTxnForm({ type: 'income', category: 'fee', amount: '', date: '', description: '' });
      setMessage('Transaction added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add transaction');
      setMessageType('danger');
    }
  };

  const deleteTransaction = async (id) => {
    try { await deleteDoc(doc(db, 'accountsTransactions', id)); setTransactions(prev => prev.filter(t => t.id !== id)); }
    catch(e){ setMessage('Failed to delete transaction'); setMessageType('danger'); }
  };

  const addInvoice = async () => {
    if (!invoiceForm.studentId || !invoiceForm.amount) { setMessage('Please select student and amount'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'accountsInvoices'), {
        ...invoiceForm,
        amount: Number(invoiceForm.amount) || 0,
        createdAt: serverTimestamp()
      });
      setInvoiceForm({ studentId: '', amount: '', dueDate: '', status: 'unpaid' });
      setMessage('Invoice created');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to create invoice');
      setMessageType('danger');
    }
  };

  const markInvoicePaid = async (id) => {
    try {
      await updateDoc(doc(db, 'accountsInvoices', id), { status: 'paid', paidAt: serverTimestamp() });
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
    } catch (e) { setMessage('Failed to update invoice'); setMessageType('danger'); }
  };

  const deleteInvoice = async (id) => {
    try { await deleteDoc(doc(db, 'accountsInvoices', id)); setInvoices(prev => prev.filter(i => i.id !== id)); }
    catch(e){ setMessage('Failed to delete invoice'); setMessageType('danger'); }
  };

  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch(e) {} };

  const toggleSidebar = () => {
    const s = document.querySelector('.sidebar-enhanced');
    const o = document.querySelector('.sidebar-overlay');
    if (s && o) { s.classList.toggle('show'); o.classList.toggle('show'); }
  };

  const getStudentName = (id) => (students.find(s => s.id === id)?.name) || 'N/A';

  const totals = transactions.reduce((acc, t) => {
    if ((t.type || 'income') === 'income') acc.income += Number(t.amount) || 0; else acc.expense += Number(t.amount) || 0; return acc;
  }, { income: 0, expense: 0 });

  // Report calculations
  const reportData = useMemo(() => {
    const filteredTransactions = transactions.filter(t => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const txnDate = t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && txnDate < reportDateRange.start) return false;
      if (reportDateRange.end && txnDate > reportDateRange.end) return false;
      return true;
    });

    const filteredInvoices = invoices.filter(inv => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const invDate = inv.dueDate || (inv.createdAt?.toDate ? inv.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && invDate < reportDateRange.start) return false;
      if (reportDateRange.end && invDate > reportDateRange.end) return false;
      return true;
    });

    const filteredChalans = chalans.filter(c => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const chDate = c.dueDate || (c.createdAt?.toDate ? c.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && chDate < reportDateRange.start) return false;
      if (reportDateRange.end && chDate > reportDateRange.end) return false;
      return true;
    });

    const reportIncome = filteredTransactions.reduce((sum, t) => sum + ((t.type === 'income' ? Number(t.amount) : 0) || 0), 0);
    const reportExpense = filteredTransactions.reduce((sum, t) => sum + ((t.type === 'expense' ? Number(t.amount) : 0) || 0), 0);
    const netProfit = reportIncome - reportExpense;

    const categoryBreakdown = {};
    filteredTransactions.forEach(t => {
      const cat = t.category || 'uncategorized';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { income: 0, expense: 0 };
      if (t.type === 'income') categoryBreakdown[cat].income += Number(t.amount) || 0;
      else categoryBreakdown[cat].expense += Number(t.amount) || 0;
    });

    const invoiceStats = {
      total: filteredInvoices.length,
      paid: filteredInvoices.filter(i => i.status === 'paid').length,
      unpaid: filteredInvoices.filter(i => i.status !== 'paid').length,
      totalAmount: filteredInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
      paidAmount: filteredInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
      unpaidAmount: filteredInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    };

    const chalanStats = {
      total: filteredChalans.length,
      paid: filteredChalans.filter(c => c.status === 'paid').length,
      pending: filteredChalans.filter(c => (c.status || 'pending') === 'pending').length,
      overdue: filteredChalans.filter(c => c.status === 'overdue').length,
      totalAmount: filteredChalans.reduce((sum, c) => sum + (Number(c.fees?.totalAmount) || 0), 0),
      paidAmount: filteredChalans.filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.fees?.totalAmount) || 0), 0),
      unpaidAmount: filteredChalans.filter(c => c.status !== 'paid').reduce((sum, c) => sum + (Number(c.fees?.totalAmount) || 0), 0)
    };

    return {
      transactions: filteredTransactions,
      invoices: filteredInvoices,
      chalans: filteredChalans,
      income: reportIncome,
      expense: reportExpense,
      netProfit,
      categoryBreakdown,
      invoiceStats,
      chalanStats
    };
  }, [transactions, invoices, chalans, reportDateRange]);

  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'transactions') {
      csvContent = 'Type,Category,Amount,Date,Description\n';
      reportData.transactions.forEach(t => {
        csvContent += `${t.type || 'income'},${t.category || ''},${t.amount || 0},${t.date || ''},"${(t.description || '').replace(/"/g, '""')}"\n`;
      });
      filename = `transactions_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'invoices') {
      csvContent = 'Student,Amount,Due Date,Status,Paid Date\n';
      reportData.invoices.forEach(inv => {
        const studentName = getStudentName(inv.studentId);
        const paidDate = inv.paidAt?.toDate ? inv.paidAt.toDate().toISOString().split('T')[0] : '';
        csvContent += `${studentName},${inv.amount || 0},${inv.dueDate || ''},${inv.status || 'unpaid'},${paidDate}\n`;
      });
      filename = `invoices_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'chalans') {
      csvContent = 'Student,Chalan #,Class,Total Amount,Due Date,Status,Paid Date\n';
      reportData.chalans.forEach(c => {
        const paidDate = c.paidAt?.toDate ? c.paidAt.toDate().toISOString().split('T')[0] : '';
        csvContent += `${c.studentName || ''},${c.chalanNumber || ''},${c.className || ''},${c.fees?.totalAmount || 0},${c.dueDate || ''},${c.status || 'pending'},${paidDate}\n`;
      });
      filename = `fee_chalans_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Financial summary
      csvContent = 'Report Type,Amount\n';
      csvContent += `Total Income,${reportData.income}\n`;
      csvContent += `Total Expense,${reportData.expense}\n`;
      csvContent += `Net Profit,${reportData.netProfit}\n`;
      csvContent += `\nInvoice Statistics\n`;
      csvContent += `Total Invoices,${reportData.invoiceStats.total}\n`;
      csvContent += `Paid Invoices,${reportData.invoiceStats.paid}\n`;
      csvContent += `Unpaid Invoices,${reportData.invoiceStats.unpaid}\n`;
      csvContent += `Total Invoice Amount,${reportData.invoiceStats.totalAmount}\n`;
      csvContent += `Paid Amount,${reportData.invoiceStats.paidAmount}\n`;
      csvContent += `Unpaid Amount,${reportData.invoiceStats.unpaidAmount}\n`;
      csvContent += `\nFee Chalan Statistics\n`;
      csvContent += `Total Chalans,${reportData.chalanStats.total}\n`;
      csvContent += `Paid Chalans,${reportData.chalanStats.paid}\n`;
      csvContent += `Pending Chalans,${reportData.chalanStats.pending}\n`;
      csvContent += `Overdue Chalans,${reportData.chalanStats.overdue}\n`;
      csvContent += `Total Chalan Amount,${reportData.chalanStats.totalAmount}\n`;
      csvContent += `Paid Amount,${reportData.chalanStats.paidAmount}\n`;
      csvContent += `Unpaid Amount,${reportData.chalanStats.unpaidAmount}\n`;
      filename = `financial_summary_${new Date().toISOString().split('T')[0]}.csv`;
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
        title="Accounts"
        onLogout={handleLogout}
        items={[
          { key: 'overview', label: 'Overview', icon: 'dashboard', onClick: () => setActiveTab('overview') },
          { key: 'transactions', label: 'Transactions', icon: 'receipt_long', onClick: () => setActiveTab('transactions') },
          { key: 'invoices', label: 'Invoices', icon: 'request_quote', onClick: () => setActiveTab('invoices') },
          { key: 'feeChalan', label: 'Fee Chalan', icon: 'request_quote', onClick: () => setActiveTab('feeChalan') },
          { key: 'reports', label: 'Reports', icon: 'insights', onClick: () => setActiveTab('reports') }
        ]}
      />)}
      <div className="flex-grow-1 d-flex flex-column container-enhanced">
        {!isAdminView && (
          <div className="mb-2 d-mobile" style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="light" 
              className="shadow-sm rounded-3"
              onClick={toggleSidebar}
              title="Open Menu"
              aria-label="Open Menu"
              style={{ width: 42, height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.1)' }}
            >
              <span style={{ display:'inline-block', width: 20 }}>
                <span style={{ display:'block', height:2, background:'#6c757d', borderRadius:2 }}></span>
                <span style={{ display:'block', height:2, background:'#6c757d', borderRadius:2, margin:'4px 0' }}></span>
                <span style={{ display:'block', height:2, background:'#6c757d', borderRadius:2 }}></span>
              </span>
            </Button>
          </div>
        )}
        
        <div className="mb-4">
          <h2 className="mb-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            <i className="fas fa-calculator me-3"></i>
            Accounts Management
          </h2>
          <p className="text-muted mb-0">Manage transactions and invoices</p>
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
                  <Card.Header style={gradientHeader}><strong>Total Income</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">PKR {totals.income.toLocaleString()}</h3>
                    <small className="text-muted">From transactions</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Total Expense</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">PKR {totals.expense.toLocaleString()}</h3>
                    <small className="text-muted">From transactions</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Unpaid Invoices</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{invoices.filter(i => i.status !== 'paid').length}</h3>
                    <small className="text-muted">Awaiting payment</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
          <Tab eventKey="feeChalan" title="Fee Chalan">
            <FeeChalan />
          </Tab>

          <Tab eventKey="transactions" title="Transactions">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Add Transaction</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Type</Form.Label>
                        <Form.Select value={txnForm.type} onChange={(e)=>setTxnForm({...txnForm, type: e.target.value})}>
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </Form.Select>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Category</Form.Label>
                        <Form.Control value={txnForm.category} onChange={(e)=>setTxnForm({...txnForm, category: e.target.value})} placeholder="e.g., fee, utility"/>
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Amount (PKR)</Form.Label>
                            <Form.Control type="number" value={txnForm.amount} onChange={(e)=>setTxnForm({...txnForm, amount: e.target.value})}/>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Date</Form.Label>
                            <Form.Control type="date" value={txnForm.date} onChange={(e)=>setTxnForm({...txnForm, date: e.target.value})}/>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control value={txnForm.description} onChange={(e)=>setTxnForm({...txnForm, description: e.target.value})} placeholder="Optional description"/>
                      </Form.Group>
                      <Button variant="success btn-enhanced" onClick={addTransaction} disabled={loading}>
                        <i className="fas fa-plus me-2"></i>
                        Add Transaction
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Transactions List</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(t => (
                          <tr key={t.id}>
                            <td><Badge bg={t.type === 'income' ? 'success' : 'danger'}>{t.type}</Badge></td>
                            <td>{t.category}</td>
                            <td>PKR {(Number(t.amount)||0).toLocaleString()}</td>
                            <td>{t.date || 'N/A'}</td>
                            <td>{t.description || ''}</td>
                            <td>
                              <Button size="sm" variant="outline-danger" onClick={()=>deleteTransaction(t.id)}>
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

          <Tab eventKey="invoices" title="Invoices">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Create Invoice</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Student</Form.Label>
                        <Form.Select value={invoiceForm.studentId} onChange={(e)=>setInvoiceForm({...invoiceForm, studentId: e.target.value})}>
                          <option value="">Select a student</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Amount (PKR)</Form.Label>
                            <Form.Control type="number" value={invoiceForm.amount} onChange={(e)=>setInvoiceForm({...invoiceForm, amount: e.target.value})}/>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Due Date</Form.Label>
                            <Form.Control type="date" value={invoiceForm.dueDate} onChange={(e)=>setInvoiceForm({...invoiceForm, dueDate: e.target.value})}/>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select value={invoiceForm.status} onChange={(e)=>setInvoiceForm({...invoiceForm, status: e.target.value})}>
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </Form.Select>
                      </Form.Group>
                      <Button variant="success btn-enhanced" onClick={addInvoice} disabled={loading}>
                        <i className="fas fa-plus me-2"></i>
                        Create Invoice
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Invoices List</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => (
                          <tr key={inv.id}>
                            <td>{getStudentName(inv.studentId)}</td>
                            <td>PKR {(Number(inv.amount)||0).toLocaleString()}</td>
                            <td>{inv.dueDate || 'N/A'}</td>
                            <td><Badge bg={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status || 'unpaid'}</Badge></td>
                            <td className="d-flex gap-2">
                              {inv.status !== 'paid' && (
                                <Button size="sm" variant="outline-success" onClick={()=>markInvoicePaid(inv.id)}>
                                  <i className="fas fa-check"></i>
                                </Button>
                              )}
                              <Button size="sm" variant="outline-danger" onClick={()=>deleteInvoice(inv.id)}>
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
                    <strong>Total Income</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">PKR {reportData.income.toLocaleString()}</h4>
                    <small className="text-muted">Period income</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', color: 'white' }}>
                    <strong>Total Expense</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">PKR {reportData.expense.toLocaleString()}</h4>
                    <small className="text-muted">Period expense</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: reportData.netProfit >= 0 ? 'var(--gradient-primary)' : 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    <strong>Net Profit</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">PKR {reportData.netProfit.toLocaleString()}</h4>
                    <small className="text-muted">Income - Expense</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}>
                    <strong>Profit Margin</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">
                      {reportData.income > 0 
                        ? `${((reportData.netProfit / reportData.income) * 100).toFixed(1)}%`
                        : '0%'}
                    </h4>
                    <ProgressBar
                      variant={reportData.netProfit >= 0 ? 'success' : 'danger'}
                      now={reportData.income > 0 ? Math.abs((reportData.netProfit / reportData.income) * 100) : 0}
                      className="mt-2"
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Card className="card-enhanced">
                <Card.Header style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Fee Chalan Statistics</strong>
                    <Button size="sm" variant="outline-light" onClick={() => exportToCSV('chalans')}>
                      <i className="fas fa-file-csv me-2"></i>Export Fee Chalans
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {reportData.chalans.length === 0 ? (
                    <p className="text-muted mb-0">No fee chalans in selected period</p>
                  ) : (
                    <Row>
                      <Col md={3}><div><small className="text-muted">Total Chalans</small><h5>{reportData.chalanStats.total}</h5></div></Col>
                      <Col md={3}><div><small className="text-muted">Paid</small><h5 className="text-success">{reportData.chalanStats.paid}</h5></div></Col>
                      <Col md={3}><div><small className="text-muted">Pending</small><h5 className="text-warning">{reportData.chalanStats.pending}</h5></div></Col>
                      <Col md={3}><div><small className="text-muted">Overdue</small><h5 className="text-danger">{reportData.chalanStats.overdue}</h5></div></Col>
                      <Col md={4} className="mt-3"><div><small className="text-muted">Total Amount</small><h5>PKR {reportData.chalanStats.totalAmount.toLocaleString()}</h5></div></Col>
                      <Col md={4} className="mt-3"><div><small className="text-muted">Paid Amount</small><h5 className="text-success">PKR {reportData.chalanStats.paidAmount.toLocaleString()}</h5></div></Col>
                      <Col md={4} className="mt-3"><div><small className="text-muted">Outstanding</small><h5 className="text-warning">PKR {reportData.chalanStats.unpaidAmount.toLocaleString()}</h5></div></Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Invoice Statistics</strong></Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted">Total Invoices</small>
                          <h5>{reportData.invoiceStats.total}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Paid</small>
                          <h5 className="text-success">{reportData.invoiceStats.paid}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Unpaid</small>
                          <h5 className="text-warning">{reportData.invoiceStats.unpaid}</h5>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted">Total Amount</small>
                          <h5>PKR {reportData.invoiceStats.totalAmount.toLocaleString()}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Paid Amount</small>
                          <h5 className="text-success">PKR {reportData.invoiceStats.paidAmount.toLocaleString()}</h5>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">Outstanding</small>
                          <h5 className="text-warning">PKR {reportData.invoiceStats.unpaidAmount.toLocaleString()}</h5>
                        </div>
                      </Col>
                    </Row>
                    {reportData.invoiceStats.total > 0 && (
                      <div className="mt-3">
                        <small className="text-muted">Payment Rate</small>
                        <ProgressBar
                          variant="success"
                          now={(reportData.invoiceStats.paid / reportData.invoiceStats.total) * 100}
                          className="mt-1"
                          label={`${((reportData.invoiceStats.paid / reportData.invoiceStats.total) * 100).toFixed(1)}%`}
                        />
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Category Breakdown</strong></Card.Header>
                  <Card.Body>
                    {Object.keys(reportData.categoryBreakdown).length === 0 ? (
                      <p className="text-muted mb-0">No transactions in selected period</p>
                    ) : (
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Income</th>
                            <th>Expense</th>
                            <th>Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.categoryBreakdown).map(([cat, data]) => (
                            <tr key={cat}>
                              <td><strong>{cat}</strong></td>
                              <td className="text-success">PKR {data.income.toLocaleString()}</td>
                              <td className="text-danger">PKR {data.expense.toLocaleString()}</td>
                              <td className={data.income - data.expense >= 0 ? 'text-success' : 'text-danger'}>
                                PKR {(data.income - data.expense).toLocaleString()}
                              </td>
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
                          <i className="fas fa-file-csv me-2"></i>Financial Summary
                        </Button>
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('transactions')}>
                          <i className="fas fa-file-csv me-2"></i>Transactions
                        </Button>
                        <Button size="sm" variant="outline-light" onClick={() => exportToCSV('invoices')}>
                          <i className="fas fa-file-csv me-2"></i>Invoices
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
                  <Card.Header style={gradientHeader}><strong>Detailed Transaction Report</strong></Card.Header>
                  <Card.Body>
                    {reportData.transactions.length === 0 ? (
                      <p className="text-muted mb-0">No transactions found in the selected period</p>
                    ) : (
                      <Table responsive striped bordered hover size="sm" className="table-enhanced">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.transactions.map(t => (
                            <tr key={t.id}>
                              <td>{t.date || 'N/A'}</td>
                              <td><Badge bg={t.type === 'income' ? 'success' : 'danger'}>{t.type || 'income'}</Badge></td>
                              <td>{t.category || 'N/A'}</td>
                              <td>PKR {(Number(t.amount) || 0).toLocaleString()}</td>
                              <td>{t.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Fee Chalans Detail</strong></Card.Header>
                  <Card.Body>
                    {reportData.chalans.length === 0 ? (
                      <p className="text-muted mb-0">No fee chalans found in the selected period</p>
                    ) : (
                      <Table responsive striped bordered hover size="sm" className="table-enhanced">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Chalan #</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.chalans.map(c => (
                            <tr key={c.id}>
                              <td>{c.dueDate || (c.createdAt?.toDate ? c.createdAt.toDate().toISOString().split('T')[0] : 'N/A')}</td>
                              <td>{c.studentName || 'N/A'}</td>
                              <td>{c.className || 'N/A'}</td>
                              <td>{c.chalanNumber || '-'}</td>
                              <td>PKR {(Number(c.fees?.totalAmount)||0).toLocaleString()}</td>
                              <td><Badge bg={c.status === 'paid' ? 'success' : (c.status === 'overdue' ? 'danger' : 'warning')}>{c.status || 'pending'}</Badge></td>
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
      </div>
    </div>
  );
};

export default AccountsDashboard;
