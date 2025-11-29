import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import jsQR from 'jsqr';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TeacherQRScan = () => {
  const { currentUser } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const hasProcessedRef = useRef(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isActive, setIsActive] = useState(false);

  const selectedDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  const start = async () => {
    hasProcessedRef.current = false;
    setIsActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        videoRef.current.play();
      }
      scanIntervalRef.current = setInterval(scanFrame, 250);
    } catch (e) {
      console.error(e);
      setMessage('Camera access denied or unavailable');
      setMessageType('danger');
    }
  };

  const stop = () => {
    setIsActive(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const scanFrame = async () => {
    if (hasProcessedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      // Stop scanning immediately to avoid double-processing the same QR
      hasProcessedRef.current = true;
      stop();
      await handleQr(code.data);
    }
  };

  const handleQr = async (data) => {
    try {
      let teacherId = null;
      try {
        const obj = JSON.parse(data);
        if (obj.teacherId) teacherId = String(obj.teacherId);
      } catch (_) {
        teacherId = data.includes('{') ? null : data.trim();
      }
      if (!teacherId) {
        setMessage('Invalid QR');
        setMessageType('warning');
        return;
      }

      // Verify the QR actually belongs to the logged-in teacher
      const meQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const meSnap = await getDocs(meQuery);
      if (meSnap.empty) {
        setMessage('User record not found');
        setMessageType('danger');
        return;
      }
      const meDoc = meSnap.docs[0];
      const me = { id: meDoc.id, ...meDoc.data() };
      if (me.id !== teacherId) {
        setMessage('This QR is not assigned to you');
        setMessageType('warning');
        return;
      }

      // Fetch existing attendance for today
      const attendanceQuery = query(collection(db, 'teacherAttendance'), where('teacherId', '==', me.id), where('date', '==', selectedDate));
      const attSnap = await getDocs(attendanceQuery);
      const now24 = new Date().toLocaleTimeString('en-US', { hour12: false });
      if (attSnap.empty) {
        await addDoc(collection(db, 'teacherAttendance'), {
          teacherId: me.id,
          teacherName: me.name,
          date: selectedDate,
          arrivalTime: now24,
          status: 'present',
          markedBy: currentUser.uid,
          markedAt: new Date()
        });
        setMessage('Arrival marked');
        setMessageType('success');
      } else {
        const rec = { id: attSnap.docs[0].id, ...attSnap.docs[0].data() };
        if (!rec.arrivalTime) {
          await updateDoc(doc(db, 'teacherAttendance', rec.id), {
            arrivalTime: now24,
            status: 'present',
            markedBy: currentUser.uid,
            markedAt: new Date()
          });
          setMessage('Arrival marked');
          setMessageType('success');
        } else if (!rec.departureTime) {
          await updateDoc(doc(db, 'teacherAttendance', rec.id), {
            departureTime: now24,
            markedBy: currentUser.uid,
            markedAt: new Date()
          });
          setMessage('Departure marked');
          setMessageType('success');
        } else {
          setMessage('Attendance already complete for today');
          setMessageType('info');
        }
      }
    } catch (e) {
      console.error('QR scan error', e);
      setMessage('Failed to mark attendance');
      setMessageType('danger');
    }
  };

  return (
    <div>
      <h2 className="mb-3">Scan Your QR</h2>
      {message && (
        <Alert variant={messageType} onClose={() => setMessage('')} dismissible>
          {message}
        </Alert>
      )}
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-center">
            <video ref={videoRef} style={{ width: '100%', maxWidth: 600, borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          <div className="mt-2 text-muted small">
            Present: first scan today records arrival and sets you present. Second scan records departure.
          </div>
          <div className="mt-3">
            {isActive ? (
              <Button variant="secondary" onClick={stop}><i className="fas fa-stop me-2"></i>Stop</Button>
            ) : (
              <Button variant="primary" onClick={start}><i className="fas fa-play me-2"></i>Start</Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TeacherQRScan;


