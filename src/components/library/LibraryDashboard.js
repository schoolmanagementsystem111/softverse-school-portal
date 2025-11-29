import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Tab, Card, Row, Col, Form, Button, Table, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../common/ModuleSidebar';

const gradientHeader = {
  background: 'var(--gradient-primary)',
  color: 'white',
  border: 'none'
};

const LibraryDashboard = () => {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [students, setStudents] = useState([]);

  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', copies: 1, status: 'available' });
  const [issueForm, setIssueForm] = useState({ studentId: '', bookId: '', status: 'issued' });
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [bookSnap, issueSnap, studentSnap] = await Promise.all([
        getDocs(collection(db, 'libraryBooks')),
        getDocs(collection(db, 'libraryIssues')),
        getDocs(query(collection(db, 'users'), where('role','==','student')))
      ]);
      setBooks(bookSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIssues(issueSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStudents(studentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMessage('Error loading library data');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const addBook = async () => {
    if (!bookForm.title) return;
    try {
      await addDoc(collection(db, 'libraryBooks'), {
        ...bookForm,
        copies: Number(bookForm.copies) || 0,
        createdAt: serverTimestamp()
      });
      setBookForm({ title: '', author: '', isbn: '', copies: 1, status: 'available' });
      setMessage('Book added');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to add book');
      setMessageType('danger');
    }
  };

  const deleteBook = async (id) => {
    try { await deleteDoc(doc(db, 'libraryBooks', id)); setBooks(prev => prev.filter(b => b.id !== id)); }
    catch(e) { setMessage('Failed to delete book'); setMessageType('danger'); }
  };

  const addIssue = async () => {
    if (!issueForm.studentId || !issueForm.bookId) {
      setMessage('Please select student and book');
      setMessageType('warning');
      return;
    }
    try {
      await addDoc(collection(db, 'libraryIssues'), {
        ...issueForm,
        issuedAt: serverTimestamp()
      });
      setIssueForm({ studentId: '', bookId: '', status: 'issued' });
      setMessage('Book issued');
      setMessageType('success');
      loadAll();
    } catch (e) {
      setMessage('Failed to issue');
      setMessageType('danger');
    }
  };

  const returnIssue = async (id) => {
    try {
      await updateDoc(doc(db, 'libraryIssues', id), { status: 'returned', returnedAt: serverTimestamp() });
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'returned' } : i));
    } catch (e) {
      setMessage('Failed to update');
      setMessageType('danger');
    }
  };

  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch(e) {} };

  const getName = (id) => (students.find(s => s.id === id)?.name) || 'N/A';
  const getBookTitle = (id) => (books.find(b => b.id === id)?.title) || 'N/A';

  // Report calculations
  const reportData = useMemo(() => {
    const filteredIssues = issues.filter(i => {
      if (!reportDateRange.start && !reportDateRange.end) return true;
      const issueDate = i.issuedAt?.toDate ? i.issuedAt.toDate().toISOString().split('T')[0] : 
                       (i.createdAt?.toDate ? i.createdAt.toDate().toISOString().split('T')[0] : '');
      if (reportDateRange.start && issueDate < reportDateRange.start) return false;
      if (reportDateRange.end && issueDate > reportDateRange.end) return false;
      return true;
    });

    const bookStats = {
      total: books.length,
      available: books.filter(b => b.status === 'available').length,
      unavailable: books.filter(b => b.status === 'unavailable').length,
      totalCopies: books.reduce((sum, b) => sum + (Number(b.copies) || 0), 0),
      issuedCopies: 0,
      availableCopies: 0
    };

    // Calculate issued and available copies
    books.forEach(book => {
      const issuedCount = issues.filter(i => i.bookId === book.id && i.status !== 'returned').length;
      bookStats.issuedCopies += issuedCount;
      bookStats.availableCopies += Math.max(0, (Number(book.copies) || 0) - issuedCount);
    });

    const issueStats = {
      total: filteredIssues.length,
      issued: filteredIssues.filter(i => i.status !== 'returned').length,
      returned: filteredIssues.filter(i => i.status === 'returned').length,
      overdue: 0 // Can be calculated if dueDate is added
    };

    const bookPopularity = {};
    filteredIssues.forEach(i => {
      if (!bookPopularity[i.bookId]) {
        bookPopularity[i.bookId] = { title: getBookTitle(i.bookId), count: 0 };
      }
      bookPopularity[i.bookId].count++;
    });

    const studentActivity = {};
    filteredIssues.forEach(i => {
      if (!studentActivity[i.studentId]) {
        studentActivity[i.studentId] = { name: getName(i.studentId), count: 0 };
      }
      studentActivity[i.studentId].count++;
    });

    const monthlyIssues = {};
    filteredIssues.forEach(i => {
      const date = i.issuedAt?.toDate ? i.issuedAt.toDate() : 
                   (i.createdAt?.toDate ? i.createdAt.toDate() : new Date());
      const month = date.toISOString().slice(0, 7); // YYYY-MM format
      if (!monthlyIssues[month]) {
        monthlyIssues[month] = { issued: 0, returned: 0, total: 0 };
      }
      monthlyIssues[month].total++;
      if (i.status === 'returned') {
        monthlyIssues[month].returned++;
      } else {
        monthlyIssues[month].issued++;
      }
    });

    return {
      issues: filteredIssues,
      bookStats,
      issueStats,
      bookPopularity,
      studentActivity,
      monthlyIssues
    };
  }, [books, issues, students, reportDateRange]);

  const exportToCSV = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'books') {
      csvContent = 'Title,Author,ISBN,Copies,Status,Issued Copies,Available Copies\n';
      books.forEach(b => {
        const issuedCount = issues.filter(i => i.bookId === b.id && i.status !== 'returned').length;
        const availableCount = Math.max(0, (Number(b.copies) || 0) - issuedCount);
        csvContent += `"${(b.title || '').replace(/"/g, '""')}","${(b.author || '').replace(/"/g, '""')}",${b.isbn || ''},${b.copies || 0},${b.status || 'available'},${issuedCount},${availableCount}\n`;
      });
      filename = `library_books_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'issues') {
      csvContent = 'Student,Book,Status,Issue Date,Return Date\n';
      reportData.issues.forEach(i => {
        const studentName = getName(i.studentId);
        const bookTitle = getBookTitle(i.bookId);
        const issueDate = i.issuedAt?.toDate ? i.issuedAt.toDate().toISOString().split('T')[0] : 
                         (i.createdAt?.toDate ? i.createdAt.toDate().toISOString().split('T')[0] : '');
        const returnDate = i.returnedAt?.toDate ? i.returnedAt.toDate().toISOString().split('T')[0] : '';
        csvContent += `"${studentName.replace(/"/g, '""')}","${bookTitle.replace(/"/g, '""')}",${i.status || 'issued'},${issueDate},${returnDate}\n`;
      });
      filename = `library_issues_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Summary report
      csvContent = 'Report Type,Value\n';
      csvContent += `Total Books,${reportData.bookStats.total}\n`;
      csvContent += `Available Books,${reportData.bookStats.available}\n`;
      csvContent += `Unavailable Books,${reportData.bookStats.unavailable}\n`;
      csvContent += `Total Copies,${reportData.bookStats.totalCopies}\n`;
      csvContent += `Issued Copies,${reportData.bookStats.issuedCopies}\n`;
      csvContent += `Available Copies,${reportData.bookStats.availableCopies}\n`;
      csvContent += `\nIssue Statistics\n`;
      csvContent += `Total Issues,${reportData.issueStats.total}\n`;
      csvContent += `Currently Issued,${reportData.issueStats.issued}\n`;
      csvContent += `Returned,${reportData.issueStats.returned}\n`;
      filename = `library_summary_report_${new Date().toISOString().split('T')[0]}.csv`;
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
        title="Library"
        onLogout={handleLogout}
        items={[
          { key: 'overview', label: 'Overview', icon: 'dashboard', onClick: () => setActiveTab('overview') },
          { key: 'books', label: 'Books', icon: 'menu_book', onClick: () => setActiveTab('books') },
          { key: 'issues', label: 'Issues', icon: 'swap_horiz', onClick: () => setActiveTab('issues') },
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
          <i className="fas fa-book me-3"></i>
          Library Management
        </h2>
        <p className="text-muted mb-0">Manage books and issues</p>
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
                <Card.Header style={gradientHeader}><strong>Books</strong></Card.Header>
                <Card.Body>
                  <h3 className="mb-0">{books.length}</h3>
                  <small className="text-muted">Total books</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Active Issues</strong></Card.Header>
                <Card.Body>
                  <h3 className="mb-0">{issues.filter(i => i.status !== 'returned').length}</h3>
                  <small className="text-muted">Currently issued</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="books" title="Books">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Add Book</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Title</Form.Label>
                      <Form.Control value={bookForm.title} onChange={(e)=>setBookForm({...bookForm, title: e.target.value})} placeholder="Book title"/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Author</Form.Label>
                      <Form.Control value={bookForm.author} onChange={(e)=>setBookForm({...bookForm, author: e.target.value})} placeholder="Author name"/>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>ISBN</Form.Label>
                          <Form.Control value={bookForm.isbn} onChange={(e)=>setBookForm({...bookForm, isbn: e.target.value})} placeholder="ISBN"/>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Copies</Form.Label>
                          <Form.Control type="number" value={bookForm.copies} onChange={(e)=>setBookForm({...bookForm, copies: e.target.value})}/>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={bookForm.status} onChange={(e)=>setBookForm({...bookForm, status: e.target.value})}>
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </Form.Select>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addBook} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Add Book
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Books List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>ISBN</th>
                        <th>Copies</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map(b => (
                        <tr key={b.id}>
                          <td>{b.title}</td>
                          <td>{b.author}</td>
                          <td>{b.isbn}</td>
                          <td>{b.copies}</td>
                          <td><Badge bg={b.status === 'available' ? 'success' : 'secondary'}>{b.status}</Badge></td>
                          <td>
                            <Button size="sm" variant="outline-danger" onClick={()=>deleteBook(b.id)}>
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

        <Tab eventKey="issues" title="Issues">
          <Row>
            <Col md={5}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Issue Book</strong></Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Student</Form.Label>
                      <Form.Select value={issueForm.studentId} onChange={(e)=>setIssueForm({...issueForm, studentId: e.target.value})}>
                        <option value="">Select a student</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Book</Form.Label>
                      <Form.Select value={issueForm.bookId} onChange={(e)=>setIssueForm({...issueForm, bookId: e.target.value})}>
                        <option value="">Select a book</option>
                        {books.filter(b => b.status === 'available').map(b => (
                          <option key={b.id} value={b.id}>{b.title} - {b.author}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={issueForm.status} onChange={(e)=>setIssueForm({...issueForm, status: e.target.value})}>
                        <option value="issued">Issued</option>
                        <option value="returned">Returned</option>
                      </Form.Select>
                    </Form.Group>
                    <Button variant="success btn-enhanced" onClick={addIssue} disabled={loading}>
                      <i className="fas fa-plus me-2"></i>
                      Issue Book
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="card-enhanced mb-3">
                <Card.Header style={gradientHeader}><strong>Issues List</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Book</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map(i => (
                        <tr key={i.id}>
                          <td>{getName(i.studentId)}</td>
                          <td>{getBookTitle(i.bookId)}</td>
                          <td><Badge bg={i.status === 'issued' ? 'warning' : 'success'}>{i.status}</Badge></td>
                          <td>
                            {i.status !== 'returned' && (
                              <Button size="sm" variant="outline-success" onClick={()=>returnIssue(i.id)}>
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
                  <strong>Total Books</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.bookStats.total}</h4>
                  <small className="text-muted">All books</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                  <strong>Total Copies</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.bookStats.totalCopies}</h4>
                  <small className="text-muted">All copies</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={{ background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', color: 'white' }}>
                  <strong>Issued Copies</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">{reportData.bookStats.issuedCopies}</h4>
                  <small className="text-muted">Currently issued</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}>
                  <strong>Utilization</strong>
                </Card.Header>
                <Card.Body>
                  <h4 className="mb-0">
                    {reportData.bookStats.totalCopies > 0 
                      ? `${((reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies) * 100).toFixed(1)}%`
                      : '0%'}
                  </h4>
                  <ProgressBar
                    variant={reportData.bookStats.totalCopies > 0 && (reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies) >= 0.7 ? 'success' : 'warning'}
                    now={reportData.bookStats.totalCopies > 0 ? (reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies) * 100 : 0}
                    className="mt-2"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Book Statistics</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Books</small>
                        <h5>{reportData.bookStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Available</small>
                        <h5 className="text-success">{reportData.bookStats.available}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Unavailable</small>
                        <h5 className="text-secondary">{reportData.bookStats.unavailable}</h5>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Copies</small>
                        <h5>{reportData.bookStats.totalCopies}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Issued Copies</small>
                        <h5 className="text-warning">{reportData.bookStats.issuedCopies}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Available Copies</small>
                        <h5 className="text-success">{reportData.bookStats.availableCopies}</h5>
                      </div>
                    </Col>
                  </Row>
                  {reportData.bookStats.totalCopies > 0 && (
                    <div className="mt-3">
                      <small className="text-muted">Copy Utilization Rate</small>
                      <ProgressBar
                        variant={reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies >= 0.7 ? 'success' : 'warning'}
                        now={(reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies) * 100}
                        className="mt-1"
                        label={`${((reportData.bookStats.issuedCopies / reportData.bookStats.totalCopies) * 100).toFixed(1)}%`}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Issue Statistics</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted">Total Issues</small>
                        <h5>{reportData.issueStats.total}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Currently Issued</small>
                        <h5 className="text-warning">{reportData.issueStats.issued}</h5>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Returned</small>
                        <h5 className="text-success">{reportData.issueStats.returned}</h5>
                      </div>
                    </Col>
                    <Col md={6}>
                      {reportData.issueStats.total > 0 && (
                        <div className="mt-3">
                          <small className="text-muted">Return Rate</small>
                          <ProgressBar
                            variant="success"
                            now={(reportData.issueStats.returned / reportData.issueStats.total) * 100}
                            className="mt-1"
                            label={`${((reportData.issueStats.returned / reportData.issueStats.total) * 100).toFixed(1)}%`}
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
                    <strong>Monthly Issue Breakdown</strong>
                  </div>
                </Card.Header>
                <Card.Body>
                  {Object.keys(reportData.monthlyIssues).length === 0 ? (
                    <p className="text-muted mb-0">No issues in selected period</p>
                  ) : (
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Total Issues</th>
                          <th>Issued</th>
                          <th>Returned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportData.monthlyIssues).map(([month, data]) => (
                          <tr key={month}>
                            <td><strong>{month}</strong></td>
                            <td>{data.total}</td>
                            <td className="text-warning">{data.issued}</td>
                            <td className="text-success">{data.returned}</td>
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
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Most Popular Books</strong></Card.Header>
                <Card.Body>
                  {Object.keys(reportData.bookPopularity).length === 0 ? (
                    <p className="text-muted mb-0">No issues recorded in selected period</p>
                  ) : (
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Book Title</th>
                          <th>Issues Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(reportData.bookPopularity)
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 10)
                          .map((book, idx) => (
                            <tr key={idx}>
                              <td>{book.title}</td>
                              <td><Badge bg="info">{book.count}</Badge></td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="card-enhanced">
                <Card.Header style={gradientHeader}><strong>Most Active Students</strong></Card.Header>
                <Card.Body>
                  {Object.keys(reportData.studentActivity).length === 0 ? (
                    <p className="text-muted mb-0">No issues recorded in selected period</p>
                  ) : (
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Issues Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(reportData.studentActivity)
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 10)
                          .map((student, idx) => (
                            <tr key={idx}>
                              <td>{student.name}</td>
                              <td><Badge bg="success">{student.count}</Badge></td>
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
                      <Button size="sm" variant="outline-light" onClick={() => exportToCSV('books')}>
                        <i className="fas fa-file-csv me-2"></i>Books
                      </Button>
                      <Button size="sm" variant="outline-light" onClick={() => exportToCSV('issues')}>
                        <i className="fas fa-file-csv me-2"></i>Issues
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
                <Card.Header style={gradientHeader}><strong>Book Inventory Details</strong></Card.Header>
                <Card.Body>
                  <Table responsive striped bordered hover size="sm" className="table-enhanced">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>ISBN</th>
                        <th>Total Copies</th>
                        <th>Issued</th>
                        <th>Available</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map(b => {
                        const issuedCount = issues.filter(i => i.bookId === b.id && i.status !== 'returned').length;
                        const availableCount = Math.max(0, (Number(b.copies) || 0) - issuedCount);
                        return (
                          <tr key={b.id}>
                            <td><strong>{b.title}</strong></td>
                            <td>{b.author || 'N/A'}</td>
                            <td>{b.isbn || 'N/A'}</td>
                            <td>{b.copies || 0}</td>
                            <td className={issuedCount > 0 ? 'text-warning' : ''}>{issuedCount}</td>
                            <td className={availableCount === 0 ? 'text-danger' : availableCount === b.copies ? 'text-success' : 'text-info'}>
                              {availableCount}
                            </td>
                            <td><Badge bg={b.status === 'available' ? 'success' : 'secondary'}>{b.status || 'available'}</Badge></td>
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
        </Col>
      </Row>
      </div>
    </div>
  );
};

export default LibraryDashboard;


