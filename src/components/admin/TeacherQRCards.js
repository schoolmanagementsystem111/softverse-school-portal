import React, { useEffect, useState, useMemo } from 'react';
import { Button, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import QRCode from 'react-qr-code';

const TeacherQRCards = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setTeachers(list);
        const profileRef = doc(db, 'schoolProfile', 'main');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.schoolName) setSchoolName(data.schoolName);
        }
      } catch (e) {
        console.error(e);
        setMessage('Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return teachers;
    const f = filter.toLowerCase();
    return teachers.filter(t => String(t.name || '').toLowerCase().includes(f) || String(t.email || '').toLowerCase().includes(f));
  }, [teachers, filter]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSingleCard = (teacher) => {
    const qrPayload = JSON.stringify({ teacherId: teacher.id });
    
    // Create a temporary container to render QR code
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '120px';
    tempDiv.style.height = '120px';
    document.body.appendChild(tempDiv);
    
    // Render QR code to get SVG
    const { createRoot } = require('react-dom/client');
    const root = createRoot(tempDiv);
    root.render(<QRCode value={qrPayload} size={120} level="M" />);
    
    // Wait for QR code to render, then get SVG
    setTimeout(() => {
      const svgElement = tempDiv.querySelector('svg');
      let qrCodeSVG = '';
      
      if (svgElement) {
        qrCodeSVG = svgElement.outerHTML;
      }
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        alert('Please allow popups to print individual cards.');
        return;
      }

      const cardHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Teacher ID Card - ${teacher.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
              padding: 20px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .teacher-badge-card {
              width: 324px;
              height: 510px;
              background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
              border: 3px solid #2c3e50;
              border-radius: 12px;
              position: relative;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .badge-lanyard-hole {
              position: absolute;
              top: 8px;
              left: 50%;
              transform: translateX(-50%);
              width: 20px;
              height: 20px;
              background: #2c3e50;
              border-radius: 50%;
              border: 3px solid #ffffff;
              z-index: 10;
            }
            .badge-header {
              background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
              color: white;
              padding: 20px 16px 16px;
              text-align: center;
              position: relative;
            }
            .badge-school-name {
              font-size: 16px;
              font-weight: 700;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .badge-role-badge {
              display: inline-block;
              background: linear-gradient(120deg, #1a73e8 0%, #1557b0 100%);
              padding: 4px 16px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 1px;
              box-shadow: 0 2px 8px rgba(26, 115, 232, 0.25);
            }
            .badge-content {
              flex: 1;
              padding: 20px 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            .badge-photo-section {
              margin-top: 8px;
            }
            .badge-photo-wrapper {
              position: relative;
              width: 100px;
              height: 100px;
            }
            .badge-photo {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              object-fit: cover;
              border: 4px solid var(--secondary-color);
              box-shadow: 0 4px 12px rgba(26, 115, 232, 0.28);
              background: white;
            }
            .badge-photo-fallback {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: linear-gradient(120deg, #1a73e8 0%, #1557b0 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 36px;
              font-weight: 700;
              border: 4px solid var(--secondary-color);
              box-shadow: 0 4px 12px rgba(26, 115, 232, 0.28);
            }
            .badge-name-section {
              text-align: center;
              width: 100%;
            }
            .badge-name {
              font-size: 20px;
              font-weight: 700;
              color: #2c3e50;
              margin-bottom: 4px;
              line-height: 1.2;
            }
            .badge-email {
              font-size: 12px;
              color: #6c757d;
              font-weight: 500;
            }
            .badge-qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              margin: 8px 0;
            }
            .badge-qr-wrapper {
              background: white;
              padding: 12px;
              border-radius: 8px;
              border: 2px solid #e9ecef;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            .badge-qr-label {
              font-size: 10px;
              color: #6c757d;
              font-weight: 600;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .badge-id-section {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              padding: 8px 12px;
              background: #f8f9fa;
              border-radius: 6px;
              border: 1px solid #e9ecef;
              width: 100%;
            }
            .badge-id-label {
              font-size: 11px;
              font-weight: 600;
              color: #6c757d;
              text-transform: uppercase;
            }
            .badge-id-value {
              font-size: 11px;
              font-weight: 600;
              color: #2c3e50;
              font-family: 'Courier New', monospace;
            }
            .badge-footer {
              padding: 12px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-top: 2px solid #dee2e6;
            }
            .badge-footer-line {
              height: 2px;
              background: linear-gradient(90deg, transparent, #1a73e8, transparent);
              border-radius: 2px;
            }
            @media print {
              body {
                padding: 0;
              }
              .teacher-badge-card {
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="teacher-badge-card">
            <div class="badge-lanyard-hole"></div>
            <div class="badge-header">
              <div class="badge-school-name">${schoolName || 'School Portal'}</div>
              <div class="badge-role-badge">TEACHER</div>
            </div>
            <div class="badge-content">
              <div class="badge-photo-section">
                ${teacher.photoURL ? 
                  `<div class="badge-photo-wrapper">
                    <img src="${teacher.photoURL}" alt="${teacher.name || 'Teacher'}" class="badge-photo" />
                  </div>` :
                  `<div class="badge-photo-wrapper">
                    <div class="badge-photo-fallback">${teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}</div>
                  </div>`
                }
              </div>
              <div class="badge-name-section">
                <div class="badge-name">${teacher.name || 'Unnamed Teacher'}</div>
                <div class="badge-email">${teacher.email || ''}</div>
              </div>
              <div class="badge-qr-section">
                <div class="badge-qr-wrapper">
                  ${qrCodeSVG || '<div style="width:120px;height:120px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;">QR Code</div>'}
                </div>
                <div class="badge-qr-label">Scan for Attendance</div>
              </div>
              <div class="badge-id-section">
                <div class="badge-id-label">ID:</div>
                <div class="badge-id-value">${teacher.id.substring(0, 12)}...</div>
              </div>
            </div>
            <div class="badge-footer">
              <div class="badge-footer-line"></div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            };
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(cardHTML);
      printWindow.document.close();
    }, 100);
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 no-print">
        <h2 className="mb-0">Teacher QR Cards</h2>
        <div className="d-flex gap-2">
          <Form.Control
            placeholder="Search by name or email"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Button variant="primary" onClick={handlePrint}>
            <i className="fas fa-print me-2"></i>
            Print
          </Button>
        </div>
      </div>
      {message && (
        <Alert variant="danger" onClose={() => setMessage('')} dismissible className="no-print">{message}</Alert>
      )}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <Row xs={1} sm={2} md={3} lg={4} xl={5} className="g-4">
          {filtered.map(t => {
            const qrPayload = JSON.stringify({ teacherId: t.id });
            return (
              <Col key={t.id}>
                <div className="teacher-badge-card">
                  {/* Print Button */}
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="badge-print-btn no-print"
                    onClick={() => handlePrintSingleCard(t)}
                    title="Print this card"
                  >
                    <i className="fas fa-print me-1"></i>
                    Print
                  </Button>
                  
                  {/* Lanyard Hole */}
                  <div className="badge-lanyard-hole"></div>
                  
                  {/* Badge Header */}
                  <div className="badge-header">
                    <div className="badge-school-name">{schoolName || 'School Portal'}</div>
                    <div className="badge-role-badge">TEACHER</div>
                  </div>
                  
                  {/* Badge Content */}
                  <div className="badge-content">
                    {/* Photo Section */}
                    <div className="badge-photo-section">
                      {t.photoURL ? (
                        <div className="badge-photo-wrapper">
                          <img 
                            src={t.photoURL} 
                            alt={t.name || 'Teacher'} 
                            className="badge-photo"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.parentElement.querySelector('.badge-photo-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="badge-photo-fallback" style={{ display: 'none' }}>
                            {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                        </div>
                      ) : (
                        <div className="badge-photo-wrapper">
                          <div className="badge-photo-fallback">
                            {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Name Section */}
                    <div className="badge-name-section">
                      <div className="badge-name">{t.name || 'Unnamed Teacher'}</div>
                      <div className="badge-email">{t.email || ''}</div>
                    </div>
                    
                    {/* QR Code Section */}
                    <div className="badge-qr-section">
                      <div className="badge-qr-wrapper">
                        <QRCode value={qrPayload} size={120} level="M" />
                      </div>
                      <div className="badge-qr-label">Scan for Attendance</div>
                    </div>
                    
                    {/* ID Section */}
                    <div className="badge-id-section">
                      <div className="badge-id-label">ID:</div>
                      <div className="badge-id-value">{t.id.substring(0, 12)}...</div>
                    </div>
                  </div>
                  
                  {/* Badge Footer */}
                  <div className="badge-footer">
                    <div className="badge-footer-line"></div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      <style>{`
        .teacher-badge-card {
          width: 100%;
          max-width: 324px;
          height: 510px;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          border: 3px solid #2c3e50;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 0 auto;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .badge-lanyard-hole {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background: #2c3e50;
          border-radius: 50%;
          border: 3px solid #ffffff;
          z-index: 10;
        }
        
        .badge-header {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 20px 16px 16px;
          text-align: center;
          position: relative;
        }
        
        .badge-school-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        
        .badge-role-badge {
          display: inline-block;
          background: linear-gradient(120deg, #1a73e8 0%, #1557b0 100%);
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(26, 115, 232, 0.25);
        }
        
        .badge-content {
          flex: 1;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        
        .badge-photo-section {
          margin-top: 8px;
        }
        
        .badge-photo-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
        }
        
        .badge-photo {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--secondary-color);
          box-shadow: 0 4px 12px rgba(26, 115, 232, 0.28);
          background: white;
        }
        
        .badge-photo-fallback {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(120deg, #1a73e8 0%, #1557b0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 36px;
          font-weight: 700;
          border: 4px solid var(--secondary-color);
          box-shadow: 0 4px 12px rgba(26, 115, 232, 0.28);
        }
        
        .badge-name-section {
          text-align: center;
          width: 100%;
        }
        
        .badge-name {
          font-size: 20px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        
        .badge-email {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }
        
        .badge-qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
        }
        
        .badge-qr-wrapper {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 2px solid #e9ecef;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .badge-qr-label {
          font-size: 10px;
          color: #6c757d;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .badge-id-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          width: 100%;
        }
        
        .badge-id-label {
          font-size: 11px;
          font-weight: 600;
          color: #6c757d;
          text-transform: uppercase;
        }
        
        .badge-id-value {
          font-size: 11px;
          font-weight: 600;
          color: #2c3e50;
          font-family: 'Courier New', monospace;
        }
        
        .badge-footer {
          padding: 12px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-top: 2px solid #dee2e6;
        }
        
        .badge-footer-line {
          height: 2px;
          background: linear-gradient(90deg, transparent, #1a73e8, transparent);
          border-radius: 2px;
        }
        
        .badge-print-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 20;
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(26, 115, 232, 0.22);
          background: linear-gradient(120deg, #1a73e8 0%, #1557b0 100%);
          border: none;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .badge-print-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
          background: linear-gradient(120deg, #1557b0 0%, #1a73e8 100%);
        }
        
        @media print {
          .no-print { display: none !important; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background: white;
          }
          .teacher-badge-card { 
            break-inside: avoid; 
            page-break-inside: avoid;
            margin: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          @page {
            margin: 0.5cm;
            size: letter;
          }
        }
        
        @media screen {
          .teacher-badge-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherQRCards;


