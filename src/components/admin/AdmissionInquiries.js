import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card, InputGroup, Badge } from 'react-bootstrap';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', variant: 'warning' },
  { value: 'contacted', label: 'Contacted', variant: 'primary' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', variant: 'info' },
  { value: 'admitted', label: 'Admitted', variant: 'success' },
  { value: 'rejected', label: 'Rejected', variant: 'danger' }
];

const AdmissionInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('new');

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const inquiriesRef = collection(db, 'admissionInquiries');
      const inquiriesQuery = query(inquiriesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(inquiriesQuery);
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setInquiries(data);
    } catch (error) {
      console.error('Error fetching admission inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInquiryModal = (inquiry) => {
    setSelectedInquiry(inquiry);
    setStatusDraft(inquiry.status || 'new');
    setNoteDraft(inquiry.adminNotes || '');
    setShowModal(true);
  };

  const closeInquiryModal = () => {
    setShowModal(false);
    setSelectedInquiry(null);
    setUpdating(false);
  };

  const getStatusMeta = (status) => STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry) return;

    setUpdating(true);
    try {
      const inquiryRef = doc(db, 'admissionInquiries', selectedInquiry.id);
      await updateDoc(inquiryRef, {
        status: statusDraft,
        adminNotes: noteDraft,
        updatedAt: new Date()
      });
      alert('Inquiry updated successfully.');
      closeInquiryModal();
      fetchInquiries();
    } catch (error) {
      console.error('Error updating inquiry:', error);
      alert('Failed to update inquiry: ' + error.message);
      setUpdating(false);
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch =
      (inquiry.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inquiry.program || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || inquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Inquiries</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            tr:nth-child(even) { background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Admission Inquiries</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Grade / Program</th>
                <th>Parent Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Preferred Session</th>
                <th>Inquiry Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInquiries.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; padding:20px;">No inquiries found</td></tr>
              ` : filteredInquiries.map(inquiry => {
                const statusMeta = getStatusMeta(inquiry.status || 'new');
                return `
                  <tr>
                    <td>${inquiry.studentName || 'N/A'}</td>
                    <td>${inquiry.program || 'N/A'}</td>
                    <td>${inquiry.parentName || 'N/A'}</td>
                    <td>${inquiry.phone || 'N/A'}</td>
                    <td>${inquiry.email || 'N/A'}</td>
                    <td>${statusMeta.label}</td>
                    <td>${inquiry.session || 'N/A'}</td>
                    <td>${inquiry.createdAt ? new Date(inquiry.createdAt.seconds ? inquiry.createdAt.seconds * 1000 : inquiry.createdAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading admission inquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Admission Inquiries</h2>
          <p className="text-muted mb-0">Track and manage prospective student inquiries</p>
        </div>
        <div>
          <Button variant="outline-primary" onClick={handlePrintList}>
            <i className="fas fa-print me-2"></i>
            Print List
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by student name, parent name, contact, or program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Inquiries ({filteredInquiries.length})</h5>
            <Button variant="outline-secondary" size="sm" onClick={fetchInquiries}>
              <i className="fas fa-sync me-2"></i>
              Refresh
            </Button>
          </div>

          <div className="table-responsive">
            <Table striped bordered hover className="table-enhanced">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th>Contact</th>
                  <th>Grade / Program</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Inquiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {searchTerm || statusFilter ? 'No inquiries match your filters' : 'No admission inquiries recorded yet'}
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map(inquiry => {
                    const statusMeta = getStatusMeta(inquiry.status || 'new');
                    return (
                      <tr key={inquiry.id}>
                        <td>
                          <strong>{inquiry.studentName || 'N/A'}</strong>
                          <div className="text-muted small">{inquiry.email || 'No email'}</div>
                        </td>
                        <td>{inquiry.parentName || 'N/A'}</td>
                        <td>
                          {inquiry.phone ? (
                            <a href={`tel:${inquiry.phone}`} className="text-decoration-none">
                              <i className="fas fa-phone me-1"></i>
                              {inquiry.phone}
                            </a>
                          ) : 'N/A'}
                        </td>
                        <td>{inquiry.program || 'N/A'}</td>
                        <td>{inquiry.session || 'N/A'}</td>
                        <td>
                          <Badge bg={statusMeta.variant}>{statusMeta.label}</Badge>
                        </td>
                        <td>
                          {inquiry.createdAt
                            ? new Date(inquiry.createdAt.seconds ? inquiry.createdAt.seconds * 1000 : inquiry.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => openInquiryModal(inquiry)}>
                            <i className="fas fa-eye me-1"></i>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeInquiryModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-graduate me-2"></i>
            Inquiry Details - {selectedInquiry?.studentName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInquiry && (
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white">
                    <strong>Student Information</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Student Name:</strong> {selectedInquiry.studentName || 'N/A'}</p>
                    <p><strong>Grade / Program:</strong> {selectedInquiry.program || 'N/A'}</p>
                    <p><strong>Preferred Session:</strong> {selectedInquiry.session || 'N/A'}</p>
                    <p><strong>Date of Birth:</strong> {
                      selectedInquiry.studentDob
                        ? new Date(selectedInquiry.studentDob.seconds ? selectedInquiry.studentDob.seconds * 1000 : selectedInquiry.studentDob).toLocaleDateString()
                        : 'N/A'
                    }</p>
                    <p><strong>Inquiry Date:</strong> {
                      selectedInquiry.createdAt
                        ? new Date(selectedInquiry.createdAt.seconds ? selectedInquiry.createdAt.seconds * 1000 : selectedInquiry.createdAt).toLocaleString()
                        : 'N/A'
                    }</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-success text-white">
                    <strong>Parent / Guardian</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Parent Name:</strong> {selectedInquiry.parentName || 'N/A'}</p>
                    <p><strong>Relationship:</strong> {selectedInquiry.relationship || 'N/A'}</p>
                    <p><strong>Phone:</strong> {selectedInquiry.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {
                      selectedInquiry.email ? (
                        <a href={`mailto:${selectedInquiry.email}`}>{selectedInquiry.email}</a>
                      ) : 'N/A'
                    }</p>
                    <p><strong>Address:</strong> {selectedInquiry.address || 'N/A'}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {selectedInquiry && (
            <Card className="mb-3">
              <Card.Header className="bg-info text-white">
                <strong>Inquiry Details</strong>
              </Card.Header>
              <Card.Body>
                <p><strong>How did they hear about us?</strong> {selectedInquiry.source || 'N/A'}</p>
                <p><strong>Previous School:</strong> {selectedInquiry.previousSchool || 'N/A'}</p>
                <p><strong>Questions / Notes:</strong></p>
                <Card className="bg-light">
                  <Card.Body>
                    {selectedInquiry.message || 'No additional information provided.'}
                  </Card.Body>
                </Card>
              </Card.Body>
            </Card>
          )}

          {selectedInquiry && (
            <Card>
              <Card.Header className="bg-secondary text-white">
                <strong>Admin Notes & Status</strong>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="statusSelect">
                      <Form.Label>Status</Form.Label>
                      <Form.Select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="followUpDate">
                      <Form.Label>Follow Up Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={selectedInquiry.followUpDate || ''}
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        Follow-up date is read-only. Update from inquiry submission form.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group controlId="adminNotes">
                  <Form.Label>Admin Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Add notes about conversations or next steps"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeInquiryModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleUpdateInquiry} disabled={updating}>
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdmissionInquiries;
