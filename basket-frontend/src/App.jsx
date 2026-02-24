import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import useSocket from '@/hooks/useSocket';

// Customer pages
import LoginPage from '@/pages/auth/LoginPage';
import HomePage from '@/pages/customer/HomePage';
import ProductsPage from '@/pages/customer/ProductsPage';
import ProductDetailPage from '@/pages/customer/ProductDetailPage';
import CartPage from '@/pages/customer/CartPage';
import CheckoutPage from '@/pages/customer/CheckoutPage';
import OrderTrackingPage from '@/pages/customer/OrderTrackingPage';
import OrderHistoryPage from '@/pages/customer/OrderHistoryPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';

// Admin pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/components/admin/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import AdminOrdersPage from '@/pages/admin/OrdersPage';
import AdminRidersPage from '@/pages/admin/RidersPage';
import AdminProductsPage from '@/pages/admin/ProductsPage';
import AdminCouponsPage from '@/pages/admin/CouponsPage';
import AdminUsersPage from '@/pages/admin/UsersPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';

// Route guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (isAuthenticated && user?.role === 'customer') return <Navigate to="/" replace />;
  return children;
};

const SocketInitializer = () => { useSocket(); return null; };

const App = () => {
  const { isAuthenticated } = useAuthStore();
  const { fetchCartCount } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) fetchCartCount();
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <SocketInitializer />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public auth */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="riders" element={<AdminRidersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>

        {/* Customer */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/orders/track/:orderId" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
