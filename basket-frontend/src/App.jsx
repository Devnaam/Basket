import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import useSocket from '@/hooks/useSocket';

// ── Auth ──────────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage';

// ── Customer pages ────────────────────────────────────────────────────
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/customer/HomePage';
import ProductsPage from '@/pages/customer/ProductsPage';
import ProductDetailPage from '@/pages/customer/ProductDetailPage';
import CartPage from '@/pages/customer/CartPage';
import CheckoutPage from '@/pages/customer/CheckoutPage';
import OrderTrackingPage from '@/pages/customer/OrderTrackingPage';
import OrderHistoryPage from '@/pages/customer/OrderHistoryPage';
import ProfilePage from '@/pages/customer/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';

// ── Admin pages ───────────────────────────────────────────────────────
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/components/admin/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import AdminOrdersPage from '@/pages/admin/OrdersPage';
import AdminRidersPage from '@/pages/admin/RidersPage';
import AdminProductsPage from '@/pages/admin/ProductsPage';
import AdminCouponsPage from '@/pages/admin/CouponsPage';
import AdminUsersPage from '@/pages/admin/UsersPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';

// ── Rider pages ───────────────────────────────────────────────────────
import RiderLayout from '@/components/rider/RiderLayout';
import RiderDashboardPage from '@/pages/rider/RiderDashboardPage';
import RiderOrderPage from '@/pages/rider/RiderOrderPage';
import RiderHistoryPage from '@/pages/rider/RiderHistoryPage';
import RiderEarningsPage from '@/pages/rider/RiderEarningsPage';
import RiderProfilePage from '@/pages/rider/RiderProfilePage';
import RiderDeliveryPage from '@/pages/rider/RiderDeliveryPage';

// ── Route Guards ──────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const CustomerRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'rider') return <Navigate to="/rider" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return children;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'rider') return <Navigate to="/rider" replace />;
  return <Navigate to="/" replace />;
};

const SocketInitializer = () => {
  useSocket();
  return null;
};

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
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── Admin ──────────────────────────────────────────────── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="riders" element={<AdminRidersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>

        {/* ── Rider ──────────────────────────────────────────────── */}
        <Route path="/rider" element={<RiderLayout />}>
          <Route index element={<RiderDashboardPage />} />
          <Route path="order" element={<RiderOrderPage />} />
          <Route path="history" element={<RiderHistoryPage />} />
          <Route path="earnings" element={<RiderEarningsPage />} />
          <Route path="profile" element={<RiderProfilePage />} />
          <Route
            path="/rider/delivery"
            element={
              <ProtectedRoute allowedRoles={['rider']}>
                <RiderDeliveryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider/earnings"
            element={
              <ProtectedRoute allowedRoles={['rider']}>
                <RiderEarningsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── Customer ───────────────────────────────────────────── */}
        <Route
          path="/"
          element={
            <CustomerRoute>
              <HomePage />
            </CustomerRoute>
          }
        />
        <Route
          path="/products"
          element={
            <CustomerRoute>
              <ProductsPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <CustomerRoute>
              <ProductDetailPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <CustomerRoute>
              <CartPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <CustomerRoute>
              <CheckoutPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <CustomerRoute>
              <OrderHistoryPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/orders/track/:orderId"
          element={
            <CustomerRoute>
              <OrderTrackingPage />
            </CustomerRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <CustomerRoute>
              <ProfilePage />
            </CustomerRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
