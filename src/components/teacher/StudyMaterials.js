import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { uploadToCloudinary, deleteFromCloudinary } from '../../utils/cloudinaryUpload';

const StudyMaterials = () => {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    materialType: 'homework',
    file: null
  });
  // New state for Homework Builder and School Name
  const [schoolName, setSchoolName] = useState('School Portal');
  const [useHomeworkBuilder, setUseHomeworkBuilder] = useState(false);
  const [homework, setHomework] = useState({ level: '', date: '', rows: [], note: '' });
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchTeacherSubjects();
    fetchMaterials();
  }, []);

  // Fetch School Name (used in homework SVG header)
  useEffect(() => {
    const fetchSchoolProfile = async () => {
      try {
        const profileRef = doc(db, 'schoolProfile', 'main');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.schoolName) setSchoolName(data.schoolName);
        }
      } catch (error) {
        console.error('Error fetching school profile:', error);
      }
    };
    fetchSchoolProfile();
  }, []);

  const fetchTeacherSubjects = async () => {
    try {
      const subjectsQuery = query(collection(db, 'subjects'), where('teacherId', '==', currentUser.uid));
      const subjectsSnapshot = await getDocs(subjectsQuery);
      setSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const materialsQuery = query(collection(db, 'studyMaterials'), where('teacherId', '==', currentUser.uid));
      const materialsSnapshot = await getDocs(materialsQuery);
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaterials(materialsList.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers for Homework Builder
  const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  };

  const addHomeworkRow = () => {
    setHomework(h => ({ ...h, rows: [...h.rows, { subject: '', details: '' }] }));
  };

  const updateHomeworkRow = (index, key, value) => {
    setHomework(h => {
      const rows = [...h.rows];
      rows[index] = { ...rows[index], [key]: value };
      return { ...h, rows };
    });
  };

  const removeHomeworkRow = (index) => {
    setHomework(h => ({ ...h, rows: h.rows.filter((_, i) => i !== index) }));
  };

  const initializeRowsFromSubjects = () => {
    if (homework.rows.length === 0 && subjects.length > 0) {
      setHomework(h => ({ ...h, rows: subjects.map(s => ({ subject: s.name || 'Subject', details: '' })) }));
    }
  };

  const generateHomeworkSVG = () => {
    try {
      initializeRowsFromSubjects();
      const width = 1100;
      const startY = 80;
      const rowHeight = 48;
      const tableWidth = width - 80;
      const col1Width = 300;
      const col2Width = tableWidth - col1Width;
      const totalRows = homework.rows.length;
      const tableHeight = rowHeight * (totalRows + 1); // + header row
      const height = startY + tableHeight + 180;
  
      const dateObj = homework.date ? new Date(homework.date) : new Date();
      const dayName = getDayName(dateObj.toISOString());
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')} - ${String(dateObj.getMonth()+1).padStart(2, '0')} - ${dateObj.getFullYear()}`;
  
      const header = `Boost Educational System`;
      const schoolTitle = schoolName || header;
  
      let svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<defs>` +
        `<style><![CDATA[
            .title { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; fill: #fff; }
            .sub { font-family: Arial, sans-serif; font-size: 18px; fill: #fff; }
            .th { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #333; }
            .td { font-family: Arial, sans-serif; font-size: 16px; fill: #333; }
            .td-sub { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #333; }
            .note { font-family: Arial, sans-serif; font-size: 16px; fill: #333; }
          ]]></style>` +
        `</defs>` +
        // Top header bar
        `<rect x="0" y="0" width="${width}" height="60" fill="#0077b6"/>` +
        `<text class="title" x="${width/2}" y="38" dominant-baseline="middle" text-anchor="middle">${schoolTitle}</text>` +
        // Subheader with level + date
        `<rect x="0" y="60" width="${width}" height="40" fill="#48cae4"/>` +
        `<text class="sub" x="30" y="85" dominant-baseline="middle">Level - ${homework.level || ''}</text>` +
        `<text class="sub" x="${width - 30}" y="85" dominant-baseline="middle" text-anchor="end">${dayName}  ${formattedDate}</text>`;
  
      // Table header
      const tableX = 40;
      const tableY = startY;
      svg += `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${rowHeight}" fill="#eaf4ff" stroke="#90e0ef"/>`;
      svg += `<text class="th" x="${tableX + 12}" y="${tableY + 30}" dominant-baseline="middle">Subject</text>`;
      svg += `<text class="th" x="${tableX + col1Width + 12}" y="${tableY + 30}" dominant-baseline="middle">Homework Details</text>`;
  
      // Table rows
      for (let i = 0; i < totalRows; i++) {
        const y = tableY + rowHeight * (i + 1);
        svg += `<rect x="${tableX}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="#fff" stroke="#ccc"/>`;
        svg += `<line x1="${tableX + col1Width}" y1="${y}" x2="${tableX + col1Width}" y2="${y + rowHeight}" stroke="#ccc"/>`;
        const subj = (homework.rows[i].subject || '').replace(/&/g, '&amp;');
        const det = (homework.rows[i].details || '').replace(/&/g, '&amp;');
        svg += `<text class="td td-sub" x="${tableX + 12}" y="${y + 30}" dominant-baseline="middle">${subj}</text>`;
        svg += `<text class="td" x="${tableX + col1Width + 12}" y="${y + 30}" dominant-baseline="middle">${det}</text>`;
      }
  
      // Note section
      const noteY = tableY + rowHeight * (totalRows + 1) + 40;
      if (homework.note) {
        svg += `<text class="note" x="${tableX}" y="${noteY}" dominant-baseline="middle">Note: ${homework.note.replace(/&/g, '&amp;')}</text>`;
      }
  
      svg += `</svg>`;
  
      // Convert SVG to PNG using Canvas
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
  
        const finalize = (pngBlob) => {
          const fileName = `homework-${formattedDate}.png`;
          const file = new File([pngBlob], fileName, { type: 'image/png' });
          setFormData(fd => ({ ...fd, file }));
          const url = URL.createObjectURL(pngBlob);
          setPreviewUrl(url);
          alert('Homework image (PNG) generated. You can now submit to upload.');
        };
  
        if (canvas.toBlob) {
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              finalize(pngBlob);
            } else {
              alert('Failed to generate PNG blob');
            }
          }, 'image/png');
        } else {
          // Fallback for environments without toBlob
          const dataUrl = canvas.toDataURL('image/png');
          fetch(dataUrl)
            .then(res => res.blob())
            .then(finalize)
            .catch(() => alert('Failed to generate PNG'));
        }
      };
      img.onerror = () => {
        console.error('Failed to render SVG to image');
        alert('Failed to generate homework image');
      };
      img.src = svgDataUrl;
    } catch (error) {
      console.error('Failed to generate homework SVG:', error);
      alert('Failed to generate homework image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let fileData = null;

      if (formData.file) {
        console.log('Uploading file to Cloudinary:', formData.file.name);
        const folder = formData.materialType === 'homework' ? 'study-materials/homework' : 'study-materials';
        fileData = await uploadToCloudinary(formData.file, folder);
        console.log('File uploaded successfully:', fileData);
      }

      const materialData = {
        title: formData.title || 'Homework',
        description: formData.description || '',
        subjectId: formData.subjectId || null,
        subjectName: formData.subjectId ? (subjects.find(s => s.id === formData.subjectId)?.name || null) : null,
        materialType: formData.materialType,
        fileUrl: fileData?.url || null,
        fileName: fileData?.fileName || null,
        fileSize: fileData?.fileSize || null,
        publicId: fileData?.publicId || null,
        // New fields for homework builder
        homeworkLevel: formData.materialType === 'homework' ? (homework.level || null) : null,
        homeworkDate: formData.materialType === 'homework' ? (homework.date || null) : null,
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName,
        createdAt: new Date()
      };

      console.log('Saving material data to Firestore:', materialData);
      await addDoc(collection(db, 'studyMaterials'), materialData);
      
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        subjectId: '',
        materialType: 'homework',
        file: null
      });
      setHomework({ level: '', date: '', rows: [], note: '' });
      setPreviewUrl(null);
      fetchMaterials();
    } catch (error) {
      console.error('Error creating material:', error);
      alert('Error uploading material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        // Find the material to get the publicId
        const material = materials.find(m => m.id === materialId);
        
        // Delete from Cloudinary if publicId exists
        if (material?.publicId) {
          console.log('Deleting file from Cloudinary:', material.publicId);
          await deleteFromCloudinary(material.publicId);
        }
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'studyMaterials', materialId));
        fetchMaterials();
      } catch (error) {
        console.error('Error deleting material:', error);
        alert('Error deleting material. Please try again.');
      }
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown';
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'homework': return 'primary';
      case 'notes': return 'info';
      case 'assignment': return 'warning';
      case 'exam': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Format homework date stored as YYYY-MM-DD string
  const formatHomeworkDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Study Materials</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Upload Material
        </Button>
      </div>

      <Row>
        {materials.map(material => (
          <Col md={material.materialType === 'homework' ? 12 : 6} key={material.id} className="mb-3">
            <Card>
              <Card.Header className={`bg-${getTypeColor(material.materialType)} text-white`}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{material.title}</h6>
                  <Badge bg="light" text="dark">{material.materialType}</Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="card-text">{material.description}</p>
                <div className="mb-2">
                  {material.materialType === 'homework' && (
                    <div className="fw-bold">Class Level: {material.homeworkLevel || 'N/A'}</div>
                  )}
                  <small className="text-muted">
                    Subject: {material.subjectName} | Uploaded: {formatDate(material.createdAt)}
                  </small>
                  {material.materialType === 'homework' && (
                    <>
                      <div className="mt-1"><strong>Date: {formatHomeworkDate(material.homeworkDate)}</strong></div>
                      <div className="mt-1"><strong>Day: {material.homeworkDay || getDayName(material.homeworkDate)}</strong></div>
                    </>
                  )}
                </div>
                {material.fileUrl && material.materialType === 'homework' ? (
                  <div className="mb-3">
                    <div className="border rounded p-2 bg-light">
                      <img
                        src={material.fileUrl}
                        alt={`${material.title} homework`}
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                    <div className="mt-2">
                      <a
                        href={(material.fileUrl && material.fileUrl.includes('/upload/')) ? material.fileUrl.replace('/upload/', '/upload/f_png,fl_attachment/') : material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={(material.fileName ? material.fileName.replace(/\.svg$/i, '.png') : 'homework.png')}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="fas fa-download me-1"></i>
                        Download PNG
                      </a>
                    </div>
                  </div>
                ) : material.fileUrl ? (
                  <div className="mb-2">
                    <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                      <i className="fas fa-download me-1"></i>
                      {material.fileName}
                    </a>
                  </div>
                ) : null}
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => handleDelete(material.id)}
                >
                  Delete
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Study Material</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required={!useHomeworkBuilder}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required={!useHomeworkBuilder}
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject</Form.Label>
                  <Form.Select
                    value={formData.subjectId}
                    onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                    required={!useHomeworkBuilder}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Material Type</Form.Label>
                  <Form.Select
                    value={formData.materialType}
                    onChange={(e) => setFormData({...formData, materialType: e.target.value})}
                  >
                    <option value="homework">Homework</option>
                    <option value="notes">Notes</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam Paper</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {formData.materialType === 'homework' && (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Homework Builder (Optional)</h6>
                  <Form.Check
                    type="switch"
                    id="homework-builder-switch"
                    label="Use Builder"
                    checked={useHomeworkBuilder}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseHomeworkBuilder(checked);
                      if (checked) initializeRowsFromSubjects();
                    }}
                  />
                </div>

                {useHomeworkBuilder && (
                  <>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Level / Class</Form.Label>
                          <Form.Control
                            type="text"
                            value={homework.level}
                            onChange={(e) => setHomework(h => ({ ...h, level: e.target.value }))}
                            placeholder="e.g., Level - 4"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={homework.date}
                            onChange={(e) => setHomework(h => ({ ...h, date: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Day</Form.Label>
                          <Form.Select
                            value={homework.day}
                            onChange={(e) => setHomework(h => ({ ...h, day: e.target.value }))}
                          >
                            <option value="">Select Day</option>
                            <option>Sunday</option>
                            <option>Monday</option>
                            <option>Tuesday</option>
                            <option>Wednesday</option>
                            <option>Thursday</option>
                            <option>Friday</option>
                            <option>Saturday</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Note</Form.Label>
                          <Form.Control
                            type="text"
                            value={homework.note}
                            onChange={(e) => setHomework(h => ({ ...h, note: e.target.value }))}
                            placeholder="e.g., Oral test on Saturday"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="mb-2 d-flex justify-content-between align-items-center">
                      <strong>Subjects & Homework Details</strong>
                      <Button variant="outline-primary" size="sm" onClick={addHomeworkRow}>
                        + Add Row
                      </Button>
                    </div>

                    {homework.rows.map((row, idx) => (
                      <Row key={idx} className="align-items-center mb-2">
                        <Col md={4}>
                          <Form.Control
                            type="text"
                            value={row.subject}
                            onChange={(e) => updateHomeworkRow(idx, 'subject', e.target.value)}
                            placeholder="Subject"
                          />
                        </Col>
                        <Col md={7}>
                          <Form.Control
                            type="text"
                            value={row.details}
                            onChange={(e) => updateHomeworkRow(idx, 'details', e.target.value)}
                            placeholder="Homework details"
                          />
                        </Col>
                        <Col md={1} className="text-end">
                          <Button variant="outline-danger" size="sm" onClick={() => removeHomeworkRow(idx)}>
                            <i className="fas fa-trash"/>
                          </Button>
                        </Col>
                      </Row>
                    ))}

                    <div className="d-flex gap-2 mt-3">
                      <Button variant="success" onClick={generateHomeworkSVG}>
                        Generate Homework Image
                      </Button>
                      {previewUrl && (
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary">
                          Preview Generated Image
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {!useHomeworkBuilder && (
              <Form.Group className="mb-3">
                <Form.Label>File</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                  required
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading || (!formData.file && useHomeworkBuilder)}>
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Uploading...
                </>
              ) : (
                'Upload Material'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default StudyMaterials;
