import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster }   from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore  from '@/store/authStore';
import useCartStore  from '@/store/cartStore';
import useSocket     from '@/hooks/useSocket';

// ── Auth ──────────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage';

// ── Customer pages ────────────────────────────────────────────────────
import Layout            from '@/components/layout/Layout';
import HomePage          from '@/pages/customer/HomePage';
import ProductsPage      from '@/pages/customer/ProductsPage';
import ProductDetailPage from '@/pages/customer/ProductDetailPage';
import CartPage          from '@/pages/customer/CartPage';
import CheckoutPage      from '@/pages/customer/CheckoutPage';
import OrderTrackingPage from '@/pages/customer/OrderTrackingPage';
import OrderHistoryPage  from '@/pages/customer/OrderHistoryPage';
import ProfilePage       from '@/pages/customer/ProfilePage';
import NotFoundPage      from '@/pages/NotFoundPage';

// ── Admin pages ───────────────────────────────────────────────────────
import AdminLoginPage     from '@/pages/admin/AdminLoginPage';
import AdminLayout        from '@/components/admin/AdminLayout';
import DashboardPage      from '@/pages/admin/DashboardPage';
import AdminOrdersPage    from '@/pages/admin/OrdersPage';
import AdminRidersPage    from '@/pages/admin/RidersPage';
import AdminProductsPage  from '@/pages/admin/ProductsPage';
import AdminCouponsPage   from '@/pages/admin/CouponsPage';
import AdminUsersPage     from '@/pages/admin/UsersPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';

// ── Rider pages ───────────────────────────────────────────────────────
import RiderLoginPage     from '@/pages/rider/RiderLoginPage';
import RiderLayout        from '@/components/rider/RiderLayout';
import RiderDashboardPage from '@/pages/rider/RiderDashboardPage';
import RiderOrderPage     from '@/pages/rider/RiderOrderPage';
import RiderHistoryPage   from '@/pages/rider/RiderHistoryPage';
import RiderEarningsPage  from '@/pages/rider/RiderEarningsPage';
import RiderProfilePage   from '@/pages/rider/RiderProfilePage';
import RiderDeliveryPage  from '@/pages/rider/RiderDeliveryPage';

// ── Route Guards ──────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const CustomerRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)       return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'rider') return <Navigate to="/rider" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)       return children;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'rider') return <Navigate to="/rider" replace />;
  return <Navigate to="/" replace />;
};

const RiderPublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)       return children;
  if (user?.role === 'rider') return <Navigate to="/rider" replace />;
  return <Navigate to="/" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)        return <Navigate to="/admin/login" replace />;
  if (user?.role !== 'admin')  return <Navigate to="/"            replace />;
  return children;
};

const RiderRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)        return <Navigate to="/rider/login" replace />;
  if (user?.role !== 'rider')  return <Navigate to="/"            replace />;
  return children;
};

const SocketInitializer = () => {
  useSocket();
  return null;
};

const App = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchCartCount }        = useCartStore();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') fetchCartCount();
  }, [isAuthenticated, user]);

  return (
    <BrowserRouter>
      {isAuthenticated && user?.role === 'customer' && <SocketInitializer />}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Routes>
        {/* ── Auth ───────────────────────────────────────────────── */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        

        {/* ── Admin ──────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders"    element={<AdminOrdersPage />} />
          <Route path="riders"    element={<AdminRidersPage />} />
          <Route path="products"  element={<AdminProductsPage />} />
          <Route path="coupons"   element={<AdminCouponsPage />} />
          <Route path="users"     element={<AdminUsersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>

        {/* ── Rider ──────────────────────────────────────────────── */}
        <Route path="/rider/login" element={<RiderPublicRoute><RiderLoginPage /></RiderPublicRoute>} />
        <Route path="/rider" element={<RiderRoute><RiderLayout /></RiderRoute>}>
          <Route index element={<RiderDashboardPage />} />
          <Route path="order"    element={<RiderOrderPage />} />
          <Route path="delivery" element={<RiderDeliveryPage />} />
          <Route path="history"  element={<RiderHistoryPage />} />
          <Route path="earnings" element={<RiderEarningsPage />} />
          <Route path="profile"  element={<RiderProfilePage />} />
        </Route>

        {/* ── Customer: standard Layout (Navbar + BottomNav) ─────── */}
        {/* These pages get Layout from the parent route element      */}
        <Route path="/" element={<CustomerRoute><Layout /></CustomerRoute>}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders"   element={<OrderHistoryPage />} />
          <Route path="profile"  element={<ProfilePage />} />
        </Route>

        {/* ── Customer: self-managed Layout (showBottom=false) ────── */}
        {/* These pages bring their own <Layout showBottom={false}>   */}
        {/* so they must NOT be nested under the parent Layout route  */}
        <Route path="/products/:id" element={<CustomerRoute><ProductDetailPage /></CustomerRoute>} />
        <Route path="/cart"         element={<CustomerRoute><CartPage /></CustomerRoute>} />
        <Route path="/checkout"     element={<CustomerRoute><CheckoutPage /></CustomerRoute>} />
        <Route path="/orders/:id"   element={<CustomerRoute><OrderTrackingPage /></CustomerRoute>} />

        {/* ── Fallbacks ──────────────────────────────────────────── */}
        <Route path="/admin/*" element={<Navigate to="/admin"        replace />} />
        <Route path="/rider/*" element={<Navigate to="/rider/login"  replace />} />
        <Route path="*"        element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
