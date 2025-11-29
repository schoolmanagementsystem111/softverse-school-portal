import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

const StudyMaterials = () => {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());

  useEffect(() => {
    fetchStudentInfo();
  }, []);

  useEffect(() => {
    if (studentInfo) {
      fetchMaterials();
    }
  }, [studentInfo]);

  const fetchStudentInfo = async () => {
    try {
      const studentQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const studentSnapshot = await getDocs(studentQuery);
      const studentData = studentSnapshot.docs[0]?.data();
      setStudentInfo(studentData);
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      console.log('Fetching materials for student:', studentInfo);
      
      // First, get all subjects to understand the relationship
      const subjectsQuery = query(collection(db, 'subjects'));
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const allSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('All subjects:', allSubjects);
      
      // Find subjects that belong to the student's class
      const studentClassSubjects = allSubjects.filter(subject => 
        subject.classId === studentInfo.classId
      );
      
      console.log('Student class subjects:', studentClassSubjects);
      
      // Get all study materials
      const materialsQuery = query(
        collection(db, 'studyMaterials'),
        orderBy('createdAt', 'desc')
      );
      const materialsSnapshot = await getDocs(materialsQuery);
      const materialsList = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('All materials:', materialsList);
      
      // Filter materials for this student's class subjects
      const filteredMaterials = materialsList.filter(material => {
        // Check if the material's subject belongs to the student's class
        const subjectBelongsToClass = studentClassSubjects.some(subject => 
          subject.id === material.subjectId
        );
        
        // Fallback: If no subjects are found for the class, show all materials
        // This handles cases where subject-class relationships aren't set up yet
        const shouldShowMaterial = studentClassSubjects.length === 0 || subjectBelongsToClass;
        
        console.log(`Material ${material.title} - Subject ${material.subjectId} belongs to class:`, subjectBelongsToClass);
        console.log(`Should show material:`, shouldShowMaterial);
        
        return shouldShowMaterial;
      });
      
      console.log('Filtered materials for student:', filteredMaterials);
      setMaterials(filteredMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      if (!timestamp) {
        return 'Date not available';
      }
      
      // Handle Firestore timestamp objects
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      
      // Handle regular Date objects or date strings
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, 'Timestamp:', timestamp);
      return 'Date Error';
    }
  };

  const handleDownload = async (fileUrl, fileName, materialId) => {
    try {
      // Add to downloading set
      setDownloadingFiles(prev => new Set(prev).add(materialId));
      
      console.log('=== DOWNLOAD DEBUG INFO ===');
      console.log('File URL:', fileUrl);
      console.log('File Name:', fileName);
      console.log('Material ID:', materialId);
      console.log('URL Type:', fileUrl ? 'Valid URL' : 'Invalid URL');
      
      // Validate URL
      if (!fileUrl) {
        throw new Error('No file URL provided');
      }
      
      // Validate URL format
      try {
        new URL(fileUrl);
      } catch (urlError) {
        throw new Error('Invalid URL format: ' + fileUrl);
      }
      
      // Prefer PNG when Cloudinary URL indicates SVG
      let downloadUrl = fileUrl;
      let downloadName = fileName || 'study-material';
      if (
        downloadUrl.includes('cloudinary.com') &&
        (downloadUrl.toLowerCase().endsWith('.svg') || (downloadName && downloadName.toLowerCase().endsWith('.svg')) || downloadUrl.includes('format=svg'))
      ) {
        console.log('Converting Cloudinary SVG to PNG for download');
        if (downloadUrl.includes('/upload/')) {
          downloadUrl = downloadUrl.replace('/upload/', '/upload/f_png,fl_attachment/');
        } else {
          downloadUrl = downloadUrl + '?fl_attachment&f=png';
        }
        downloadName = downloadName.replace(/\.svg$/i, '.png');
      }
      
      // Method 1: Try fetch + blob download (most reliable)
      try {
        console.log('Attempting fetch + blob download...');
        const response = await fetch(downloadUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('Blob created:', blob.size, 'bytes');
        
        // Create blob URL and download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
        
        console.log('Fetch + blob download successful');
        return;
      } catch (fetchError) {
        console.log('Fetch + blob download failed:', fetchError.message);
        console.log('Trying alternative method...');
      }
      
      // Method 2: Try Cloudinary-specific handling
      if (downloadUrl.includes('cloudinary.com')) {
        console.log('Processing Cloudinary URL with attachment flag');
      
        // Try multiple Cloudinary URL variations (ensure PNG)
        const baseUrl = downloadUrl.includes('/upload/')
          ? downloadUrl.replace('/upload/', '/upload/f_png,fl_attachment/')
          : downloadUrl + '?fl_attachment&f=png';
        const urlVariations = [
          baseUrl,
          downloadUrl + '?fl_attachment&f=png',
          downloadUrl.replace('/upload/', '/upload/fl_attachment/') // fallback attachment only
        ];
      
        for (let i = 0; i < urlVariations.length; i++) {
          try {
            console.log(`Trying Cloudinary variation ${i + 1}:`, urlVariations[i]);
      
            const link = document.createElement('a');
            link.href = urlVariations[i];
            link.download = downloadName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.display = 'none';
      
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
      
            console.log(`Cloudinary variation ${i + 1} successful`);
            return;
          } catch (cloudinaryError) {
            console.log(`Cloudinary variation ${i + 1} failed:`, cloudinaryError.message);
          }
        }
      }
      
      // Method 3: Standard anchor download
      console.log('Trying standard anchor download...');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Standard anchor download attempted');
      
    } catch (error) {
      console.error('=== DOWNLOAD ERROR ===');
      console.error('All download methods failed:', error);
      console.error('Error details:', error.message);
      
      // Final fallback: open in new tab
      console.log('Opening file in new tab as final fallback...');
      alert(`Download failed. Opening file in new tab instead.`);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } finally {
      // Remove from downloading set
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Study Materials</h2>
        <Button variant="outline-primary" onClick={() => {
          setLoading(true);
          fetchMaterials();
        }}>
          <i className="fas fa-sync-alt me-2"></i>
          Refresh
        </Button>
      </div>
      
      {studentInfo && (
        <div className="alert alert-info mb-3">
          <strong>Student Info:</strong> Class ID: {studentInfo.classId} | Name: {studentInfo.name}
        </div>
      )}
      
      <Row>
        {materials.length > 0 ? (
          materials.map(material => (
            <Col md={6} key={material.id} className="mb-3">
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
                    <small className="text-muted">
                      Subject: {material.subjectName} | Teacher: {material.teacherName} | Uploaded: {formatDate(material.createdAt)}
                    </small>
                  </div>
                  {material.fileUrl && (
                    <div className="mb-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => {
                          console.log('=== MATERIAL DATA DEBUG ===');
                          console.log('Material:', material);
                          console.log('File URL:', material.fileUrl);
                          console.log('File Name:', material.fileName);
                          console.log('Material ID:', material.id);
                          handleDownload(material.fileUrl, material.fileName, material.id);
                        }}
                        disabled={downloadingFiles.has(material.id)}
                      >
                        {downloadingFiles.has(material.id) ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-download me-1"></i>
                            Download {material.fileName || 'File'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col md={12}>
            <Card>
              <Card.Body className="text-center">
                <h5>No study materials available</h5>
                <p className="text-muted">Check back later for homework, notes, and assignments from your teachers.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default StudyMaterials;
