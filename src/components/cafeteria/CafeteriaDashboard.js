import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, Tab, Card, Row, Col, Form, Button, Table, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../common/ModuleSidebar';

const gradientHeader = {
  background: 'var(--gradient-primary)',
  color: 'white',
  border: 'none'
};

const CafeteriaDashboard = () => {
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const [menu, setMenu] = useState([]); // cafeteriaMenu
  const [inventory, setInventory] = useState([]); // cafeteriaInventory
  const [orders, setOrders] = useState([]); // cafeteriaOrders

  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '' });
  const [inventoryForm, setInventoryForm] = useState({ item: '', quantity: '', unit: 'pcs' });
  const [orderForm, setOrderForm] = useState({ customerName: '', itemId: '', quantity: 1, status: 'pending' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [menuSnap, invSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, 'cafeteriaMenu')),
        getDocs(collection(db, 'cafeteriaInventory')),
        getDocs(collection(db, 'cafeteriaOrders')),
      ]);
      setMenu(menuSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInventory(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMessage('Error loading cafeteria data');
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async () => {
    if (!menuForm.name || !menuForm.price) { setMessage('Enter item name and price'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'cafeteriaMenu'), { ...menuForm, price: Number(menuForm.price)||0, createdAt: serverTimestamp() });
      setMenuForm({ name: '', price: '', category: '' });
      setMessage('Menu item added'); setMessageType('success');
      loadAll();
    } catch (e) { setMessage('Failed to add item'); setMessageType('danger'); }
  };

  const deleteMenuItem = async (id) => { try { await deleteDoc(doc(db, 'cafeteriaMenu', id)); setMenu(prev => prev.filter(m => m.id !== id)); } catch(e){ setMessage('Failed to delete item'); setMessageType('danger'); } };

  const addInventoryItem = async () => {
    if (!inventoryForm.item) { setMessage('Enter inventory item'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'cafeteriaInventory'), { ...inventoryForm, quantity: Number(inventoryForm.quantity)||0, createdAt: serverTimestamp() });
      setInventoryForm({ item: '', quantity: '', unit: 'pcs' });
      setMessage('Inventory item added'); setMessageType('success');
      loadAll();
    } catch (e) { setMessage('Failed to add inventory'); setMessageType('danger'); }
  };

  const deleteInventoryItem = async (id) => { try { await deleteDoc(doc(db, 'cafeteriaInventory', id)); setInventory(prev => prev.filter(i => i.id !== id)); } catch(e){ setMessage('Failed to delete inventory'); setMessageType('danger'); } };

  const addOrder = async () => {
    if (!orderForm.itemId || !orderForm.quantity) { setMessage('Select item and quantity'); setMessageType('warning'); return; }
    try {
      await addDoc(collection(db, 'cafeteriaOrders'), { ...orderForm, quantity: Number(orderForm.quantity)||1, createdAt: serverTimestamp() });
      setOrderForm({ customerName: '', itemId: '', quantity: 1, status: 'pending' });
      setMessage('Order placed'); setMessageType('success');
      loadAll();
    } catch (e) { setMessage('Failed to add order'); setMessageType('danger'); }
  };

  const updateOrderStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'cafeteriaOrders', id), { status }); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); }
    catch(e){ setMessage('Failed to update order'); setMessageType('danger'); }
  };

  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch(e) {} };

  const totals = useMemo(() => {
    const revenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => {
      const item = menu.find(m => m.id === o.itemId);
      return sum + ((item?.price || 0) * (Number(o.quantity)||1));
    }, 0);
    const pendingOrders = orders.filter(o => o.status !== 'paid').length;
    return { revenue, pendingOrders, items: menu.length };
  }, [orders, menu]);

  const isAdminView = userRole === 'admin';

  return (
    <div className="d-flex min-vh-100">
      {!isAdminView && (
        <div className="sidebar-overlay" onClick={() => { const s=document.querySelector('.sidebar-enhanced'); const o=document.querySelector('.sidebar-overlay'); if (s&&o){s.classList.remove('show'); o.classList.remove('show');}}}></div>
      )}
      {!isAdminView && (
      <ModuleSidebar
        title="Cafeteria"
        onLogout={handleLogout}
        items={[
          { key: 'overview', label: 'Overview', icon: 'dashboard', onClick: () => setActiveTab('overview') },
          { key: 'menu', label: 'Menu', icon: 'restaurant_menu', onClick: () => setActiveTab('menu') },
          { key: 'orders', label: 'Orders', icon: 'receipt_long', onClick: () => setActiveTab('orders') },
          { key: 'inventory', label: 'Inventory', icon: 'inventory_2', onClick: () => setActiveTab('inventory') },
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
            <i className="fas fa-coffee me-3"></i>
            Cafeteria Management
          </h2>
          <p className="text-muted mb-0">Manage menu, orders, and inventory</p>
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
                  <Card.Header style={gradientHeader}><strong>Menu Items</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{totals.items}</h3>
                    <small className="text-muted">Total items</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Pending Orders</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">{totals.pendingOrders}</h3>
                    <small className="text-muted">Awaiting payment</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Revenue (Paid)</strong></Card.Header>
                  <Card.Body>
                    <h3 className="mb-0">PKR {totals.revenue.toLocaleString()}</h3>
                    <small className="text-muted">From paid orders</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="menu" title="Menu">
            <Row>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Add Menu Item</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={menuForm.name} onChange={(e)=>setMenuForm({...menuForm, name: e.target.value})}/></Form.Group>
                      <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Price (PKR)</Form.Label><Form.Control type="number" value={menuForm.price} onChange={(e)=>setMenuForm({...menuForm, price: e.target.value})}/></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Category</Form.Label><Form.Control value={menuForm.category} onChange={(e)=>setMenuForm({...menuForm, category: e.target.value})} placeholder="e.g., snack, drink"/></Form.Group></Col>
                      </Row>
                      <Button variant="success btn-enhanced" onClick={addMenuItem} disabled={loading}><i className="fas fa-plus me-2"></i>Add Item</Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Menu</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead>
                      <tbody>
                        {menu.map(m => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>{m.category || '-'}</td>
                            <td>PKR {(Number(m.price)||0).toLocaleString()}</td>
                            <td>
                              <Button size="sm" variant="outline-danger" onClick={()=>deleteMenuItem(m.id)}><i className="fas fa-trash"></i></Button>
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

          <Tab eventKey="orders" title="Orders">
            <Row>
              <Col md={5}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Create Order</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3"><Form.Label>Customer Name</Form.Label><Form.Control value={orderForm.customerName} onChange={(e)=>setOrderForm({...orderForm, customerName: e.target.value})} placeholder="Optional"/></Form.Group>
                      <Row>
                        <Col md={8}><Form.Group className="mb-3"><Form.Label>Item</Form.Label><Form.Select value={orderForm.itemId} onChange={(e)=>setOrderForm({...orderForm, itemId: e.target.value})}><option value="">Select item</option>{menu.map(m=>(<option key={m.id} value={m.id}>{m.name} - PKR {(Number(m.price)||0).toLocaleString()}</option>))}</Form.Select></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Qty</Form.Label><Form.Control type="number" value={orderForm.quantity} onChange={(e)=>setOrderForm({...orderForm, quantity: e.target.value})}/></Form.Group></Col>
                      </Row>
                      <Form.Group className="mb-3"><Form.Label>Status</Form.Label><Form.Select value={orderForm.status} onChange={(e)=>setOrderForm({...orderForm, status: e.target.value})}><option value="pending">Pending</option><option value="paid">Paid</option></Form.Select></Form.Group>
                      <Button variant="success btn-enhanced" onClick={addOrder} disabled={loading}><i className="fas fa-plus me-2"></i>Add Order</Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={7}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Orders</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead><tr><th>Customer</th><th>Item</th><th>Qty</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {orders.map(o => {
                          const item = menu.find(m => m.id === o.itemId);
                          const total = ((item?.price||0) * (Number(o.quantity)||1));
                          return (
                            <tr key={o.id}>
                              <td>{o.customerName || 'Walk-in'}</td>
                              <td>{item?.name || '-'}</td>
                              <td>{o.quantity}</td>
                              <td>PKR {total.toLocaleString()}</td>
                              <td><Badge bg={o.status === 'paid' ? 'success' : 'warning'}>{o.status}</Badge></td>
                              <td className="d-flex gap-2">
                                {o.status !== 'paid' && (
                                  <Button size="sm" variant="outline-success" onClick={()=>updateOrderStatus(o.id, 'paid')}><i className="fas fa-check"></i></Button>
                                )}
                                <Button size="sm" variant="outline-danger" onClick={()=>{ deleteDoc(doc(db,'cafeteriaOrders', o.id)).then(()=>setOrders(prev=>prev.filter(od=>od.id!==o.id))).catch(()=>{ setMessage('Failed to delete order'); setMessageType('danger');}); }}><i className="fas fa-trash"></i></Button>
                              </td>
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

          <Tab eventKey="inventory" title="Inventory">
            <Row>
              <Col md={4}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Add Inventory</strong></Card.Header>
                  <Card.Body>
                    <Form>
                      <Form.Group className="mb-3"><Form.Label>Item</Form.Label><Form.Control value={inventoryForm.item} onChange={(e)=>setInventoryForm({...inventoryForm, item: e.target.value})}/></Form.Group>
                      <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Quantity</Form.Label><Form.Control type="number" value={inventoryForm.quantity} onChange={(e)=>setInventoryForm({...inventoryForm, quantity: e.target.value})}/></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Unit</Form.Label><Form.Control value={inventoryForm.unit} onChange={(e)=>setInventoryForm({...inventoryForm, unit: e.target.value})} placeholder="pcs, kg, ltr"/></Form.Group></Col>
                      </Row>
                      <Button variant="success btn-enhanced" onClick={addInventoryItem} disabled={loading}><i className="fas fa-plus me-2"></i>Add Inventory</Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <Card className="card-enhanced mb-3">
                  <Card.Header style={gradientHeader}><strong>Inventory</strong></Card.Header>
                  <Card.Body>
                    <Table responsive striped bordered hover size="sm" className="table-enhanced">
                      <thead><tr><th>Item</th><th>Quantity</th><th>Unit</th><th>Actions</th></tr></thead>
                      <tbody>
                        {inventory.map(i => (
                          <tr key={i.id}>
                            <td>{i.item}</td>
                            <td>{i.quantity}</td>
                            <td>{i.unit || 'pcs'}</td>
                            <td>
                              <Button size="sm" variant="outline-danger" onClick={()=>deleteInventoryItem(i.id)}><i className="fas fa-trash"></i></Button>
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
              <Col md={4}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
                    <strong>Paid Orders</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{orders.filter(o=>o.status==='paid').length}</h4>
                    <small className="text-muted">Completed payments</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', color: 'white' }}>
                    <strong>Pending Orders</strong>
                  </Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">{orders.filter(o=>o.status!=='paid').length}</h4>
                    <small className="text-muted">Awaiting payment</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Revenue</strong></Card.Header>
                  <Card.Body>
                    <h4 className="mb-0">PKR {totals.revenue.toLocaleString()}</h4>
                    <small className="text-muted">Sum of paid order totals</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Card className="card-enhanced">
                  <Card.Header style={gradientHeader}><strong>Orders Detail</strong></Card.Header>
                  <Card.Body>
                    {orders.length === 0 ? (
                      <p className="text-muted mb-0">No cafeteria orders found</p>
                    ) : (
                      <Table responsive striped bordered hover size="sm" className="table-enhanced">
                        <thead><tr><th>Date</th><th>Customer</th><th>Item</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
                        <tbody>
                          {orders.map(o => {
                            const item = menu.find(m => m.id === o.itemId);
                            const total = ((item?.price||0) * (Number(o.quantity)||1));
                            return (
                              <tr key={o.id}>
                                <td>{o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : 'N/A'}</td>
                                <td>{o.customerName || 'Walk-in'}</td>
                                <td>{item?.name || '-'}</td>
                                <td>{o.quantity}</td>
                                <td>PKR {total.toLocaleString()}</td>
                                <td><Badge bg={o.status === 'paid' ? 'success' : 'warning'}>{o.status}</Badge></td>
                              </tr>
                            );
                          })}
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

export default CafeteriaDashboard;


