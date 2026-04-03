import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Orders from './pages/admin/Orders';
import Cash from './pages/admin/Cash';
import Partners from './pages/admin/Partners';
import Clients from './pages/admin/Clients';
import Analytics from './pages/admin/Analytics';
import Settings from './pages/admin/Settings';
import DirectSale from './pages/admin/DirectSale';
import Shop from './pages/client/Shop';
import Cart from './pages/client/Cart';
import MyOrders from './pages/client/MyOrders';
import Account from './pages/client/Account';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'admin' | 'client' }) => {
  const { user } = useAppStore();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to={user.role === 'admin' ? '/admin' : '/client'} replace />;
  return <>{children}</>;
};

function App() {
  const { user } = useAppStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/client'} replace /> : <Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="direct-sale" element={<DirectSale />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="clients" element={<Clients />} />
          <Route path="orders" element={<Orders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="cash" element={<Cash />} />
          <Route path="expenses" element={<Navigate to="/admin/cash" replace />} />
          <Route path="partners" element={<Partners />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="text-center py-12 text-slate-500">صفحة غير موجودة</div>} />
        </Route>

        {/* Client Routes */}
        <Route path="/client" element={<ProtectedRoute allowedRole="client"><ClientLayout /></ProtectedRoute>}>
          <Route index element={<Account />} />
          <Route path="account" element={<Account />} />
          <Route path="shop" element={<Shop />} />
          <Route path="cart" element={<Cart />} />
          <Route path="my-orders" element={<MyOrders />} />
          <Route path="*" element={<div>صفحة غير موجودة</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
