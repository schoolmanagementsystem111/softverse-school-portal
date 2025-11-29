import React, { useEffect, useState } from 'react';
import { Nav } from 'react-bootstrap';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ModuleSidebar = ({ title = 'Module', items = [], onLogout, onClose }) => {
  const [schoolName, setSchoolName] = useState('School Portal');

  useEffect(() => {
    const fetchSchoolProfile = async () => {
      try {
        const profileRef = doc(db, 'schoolProfile', 'main');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.schoolName) setSchoolName(data.schoolName);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchSchoolProfile();
  }, []);

  const handleCloseSidebar = () => {
    const sidebar = document.querySelector('.sidebar-enhanced');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
    if (onClose) onClose();
  };

  return (
    <div className="sidebar-enhanced" style={{ width: '280px', minHeight: '100vh', position: 'relative' }}>
      <button className="sidebar-close-btn" onClick={handleCloseSidebar}>
        <span className="material-symbols-rounded" data-icon="close">close</span>
      </button>
      <div className="p-4">
        <div className="d-flex align-items-center">
          <div className="me-3">
            <span className="material-symbols-rounded sidebar-header-icon" data-icon="dashboard" style={{ display: 'inline-flex' }}>dashboard</span>
          </div>
          <div>
            <h5 className="mb-0" style={{ fontWeight: '700', color: 'white' }}>{title}</h5>
            <small style={{ color: 'rgba(255,255,255,0.7)' }}>{schoolName}</small>
          </div>
        </div>
      </div>
      <Nav className="flex-column px-3">
        {items.map((it) => (
          <Nav.Link key={it.key} className="text-white sidebar-item" onClick={() => { it.onClick(); handleCloseSidebar(); }} style={{ cursor: 'pointer' }}>
            <span className="material-symbols-rounded me-2" data-icon={it.icon}>{it.icon}</span>
            {it.label}
          </Nav.Link>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '10px', paddingTop: '10px' }}>
          <Nav.Link className="text-white sidebar-item" onClick={() => { if (onLogout) onLogout(); handleCloseSidebar(); }} style={{ cursor: 'pointer' }}>
            <span className="material-symbols-rounded me-2" data-icon="logout">logout</span>
            Logout
          </Nav.Link>
        </div>
      </Nav>
    </div>
  );
};

export default ModuleSidebar;


