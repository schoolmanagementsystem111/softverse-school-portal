import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Modal, Badge, InputGroup, Alert } from 'react-bootstrap';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Ledger = () => {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' or 'income'
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash'
  });

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Categories
  const expenseCategories = [
    'Salaries',
    'Utilities',
    'Maintenance',
    'Supplies',
    'Transportation',
    'Marketing',
    'Insurance',
    'Taxes',
    'Rent',
    'Other'
  ];

  const incomeCategories = [
    'Tuition Fees',
    'Admission Fees',
    'Examination Fees',
    'Transport Fees',
    'Library Fees',
    'Cafeteria Revenue',
    'Donations',
    'Grants',
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'expenses') {
        const expensesRef = collection(db, 'ledgerExpenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const expensesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date
        }));
        setExpenses(expensesData);
      } else {
        const incomeRef = collection(db, 'ledgerIncome');
        const q = query(incomeRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const incomeData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date
        }));
        setIncome(incomeData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to fetch data');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash'
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      amount: item.amount || '',
      category: item.category || '',
      description: item.description || '',
      date: item.date || new Date().toISOString().split('T')[0],
      paymentMethod: item.paymentMethod || 'cash'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const collectionName = activeTab === 'expenses' ? 'ledgerExpenses' : 'ledgerIncome';
      const dataToSave = {
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description || '',
        date: Timestamp.fromDate(new Date(formData.date)),
        paymentMethod: formData.paymentMethod,
        createdAt: editingItem ? editingItem.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingItem) {
        const docRef = doc(db, collectionName, editingItem.id);
        await updateDoc(docRef, dataToSave);
        setMessage('Item updated successfully');
      } else {
        await addDoc(collection(db, collectionName), dataToSave);
        setMessage('Item added successfully');
      }

      setMessageType('success');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      setMessage('Failed to save item');
      setMessageType('danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const collectionName = activeTab === 'expenses' ? 'ledgerExpenses' : 'ledgerIncome';
      await deleteDoc(doc(db, collectionName, id));
      setMessage('Item deleted successfully');
      setMessageType('success');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      setMessage('Failed to delete item');
      setMessageType('danger');
    }
  };

  // Filter data
  const getFilteredData = () => {
    const data = activeTab === 'expenses' ? expenses : income;
    let filtered = [...data];

    // Date filter
    if (filterDateFrom) {
      filtered = filtered.filter(item => item.date >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter(item => item.date <= filterDateTo);
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  // Calculate totals
  const calculateTotals = () => {
    const filtered = getFilteredData();
    const total = filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return total;
  };

  const filteredData = getFilteredData();
  const totalAmount = calculateTotals();
  const categories = activeTab === 'expenses' ? expenseCategories : incomeCategories;

  return (
    <div className="animate-fadeInUp">
      {message && (
        <Alert variant={messageType} onClose={() => setMessage('')} dismissible className="mb-4">
          {message}
        </Alert>
      )}

      <div className="mb-4">
        <h2 className="mb-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <i className="fas fa-book me-3"></i>
          Ledger Management
        </h2>
        <p className="text-muted mb-0">Manage expenses and income for your school</p>
      </div>

      {/* Tabs */}
      <Card className="card-enhanced mb-4">
        <Card.Body>
          <div className="d-flex gap-2 mb-4">
            <Button
              variant={activeTab === 'expenses' ? 'primary' : 'outline-secondary'}
              className="btn-enhanced"
              onClick={() => setActiveTab('expenses')}
            >
              <i className="fas fa-arrow-down me-2"></i>
              Expenses
            </Button>
            <Button
              variant={activeTab === 'income' ? 'success' : 'outline-secondary'}
              className="btn-enhanced"
              onClick={() => setActiveTab('income')}
            >
              <i className="fas fa-arrow-up me-2"></i>
              Income
            </Button>
          </div>

          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="card-enhanced" style={{ background: activeTab === 'expenses' ? 'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)' : 'linear-gradient(135deg, #34a853 0%, #0b8043 100%)', color: 'white', border: 'none' }}>
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-1" style={{ opacity: 0.9 }}>Total {activeTab === 'expenses' ? 'Expenses' : 'Income'}</h6>
                      <h3 className="mb-0" style={{ fontWeight: 700 }}>
                        PKR {totalAmount.toLocaleString()}
                      </h3>
                    </div>
                    <i className={`fas fa-${activeTab === 'expenses' ? 'arrow-down' : 'arrow-up'} fa-3x`} style={{ opacity: 0.3 }}></i>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="card-enhanced">
                <Card.Body>
                  <h6 className="text-muted mb-1">Total Records</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700, color: 'var(--secondary-color)' }}>
                    {filteredData.length}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="card-enhanced">
                <Card.Body>
                  <h6 className="text-muted mb-1">This Month</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700, color: 'var(--secondary-color)' }}>
                    PKR {(() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                      const thisMonthData = filteredData.filter(item => item.date >= firstDay && item.date <= lastDay);
                      return thisMonthData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString();
                    })()}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card className="card-enhanced mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-filter me-2"></i>
                Filters
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Search</Form.Label>
                    <InputGroup>
                      <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search by title, description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>From Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>To Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              {(filterDateFrom || filterDateTo || filterCategory || searchTerm) && (
                <Button
                  variant="outline-secondary"
                  className="btn-enhanced"
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterCategory('');
                    setSearchTerm('');
                  }}
                >
                  <i className="fas fa-times me-2"></i>
                  Clear Filters
                </Button>
              )}
            </Card.Body>
          </Card>

          {/* Action Button */}
          <div className="mb-3">
            <Button
              variant={activeTab === 'expenses' ? 'danger' : 'success'}
              className="btn-enhanced"
              onClick={openAddModal}
            >
              <i className={`fas fa-plus me-2`}></i>
              Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <Card className="card-enhanced">
              <Card.Body className="text-center py-5">
                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p className="text-muted">No {activeTab} records found</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="card-enhanced">
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="table-enhanced mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Amount (PKR)</th>
                        <th>Payment Method</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item) => (
                        <tr key={item.id}>
                          <td>{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                          <td><strong>{item.title || '-'}</strong></td>
                          <td>
                            <Badge className="badge-enhanced" style={{ background: activeTab === 'expenses' ? 'rgba(234, 67, 53, 0.12)' : 'rgba(52, 168, 83, 0.12)', color: activeTab === 'expenses' ? '#ea4335' : '#34a853' }}>
                              {item.category || '-'}
                            </Badge>
                          </td>
                          <td><strong style={{ color: activeTab === 'expenses' ? '#ea4335' : '#34a853' }}>PKR {Number(item.amount || 0).toLocaleString()}</strong></td>
                          <td>{item.paymentMethod || 'cash'}</td>
                          <td>{item.description || '-'}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => openEditModal(item)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--color-surface-muted)', fontWeight: 'bold' }}>
                        <td colSpan="3"><strong>Total</strong></td>
                        <td><strong style={{ color: activeTab === 'expenses' ? '#ea4335' : '#34a853' }}>PKR {totalAmount.toLocaleString()}</strong></td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas fa-${editingItem ? 'edit' : 'plus'} me-2`}></i>
            {editingItem ? 'Edit' : 'Add'} {activeTab === 'expenses' ? 'Expense' : 'Income'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter title"
                    className="form-control-enhanced"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount (PKR) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="form-control-enhanced"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control-enhanced"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="form-control-enhanced"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="form-control-enhanced"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                className="form-control-enhanced"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary btn-enhanced" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant={activeTab === 'expenses' ? 'danger' : 'success'} type="submit" className="btn-enhanced">
              <i className={`fas fa-${editingItem ? 'save' : 'plus'} me-2`}></i>
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Ledger;

