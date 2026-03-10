import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster }  from 'react-hot-toast';
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
import SetupProfilePage  from '@/pages/customer/SetupProfilePage'; // ← NEW
import NotFoundPage      from '@/pages/NotFoundPage';

// ── Admin pages ───────────────────────────────────────────────────────
import AdminLoginPage    from '@/pages/admin/AdminLoginPage';
import AdminLayout       from '@/components/admin/AdminLayout';
import DashboardPage     from '@/pages/admin/DashboardPage';
import AdminOrdersPage   from '@/pages/admin/OrdersPage';
import AdminRidersPage   from '@/pages/admin/RidersPage';
import AdminProductsPage from '@/pages/admin/ProductsPage';
import AdminCouponsPage  from '@/pages/admin/CouponsPage';
import AdminUsersPage    from '@/pages/admin/UsersPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';

// ── Rider pages ───────────────────────────────────────────────────────
import RiderLoginPage    from '@/pages/rider/RiderLoginPage';   // ← NEW
import RiderLayout       from '@/components/rider/RiderLayout';
import RiderDashboardPage from '@/pages/rider/RiderDashboardPage';
import RiderOrderPage    from '@/pages/rider/RiderOrderPage';
import RiderHistoryPage  from '@/pages/rider/RiderHistoryPage';
import RiderEarningsPage from '@/pages/rider/RiderEarningsPage';
import RiderProfilePage  from '@/pages/rider/RiderProfilePage';
import RiderDeliveryPage from '@/pages/rider/RiderDeliveryPage';

// ─────────────────────────────────────────────────────────────────────
// Route Guards
// ─────────────────────────────────────────────────────────────────────

// Any authenticated user — block if not logged in
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Customer only — redirect admin/rider to their portals
const CustomerRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)          return <Navigate to="/login"        replace />;
  if (user?.role === 'admin')    return <Navigate to="/admin"        replace />;
  if (user?.role === 'rider')    return <Navigate to="/rider"        replace />;
  return children;
};

// Public customer route — redirect if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)          return children;
  if (user?.role === 'admin')    return <Navigate to="/admin"        replace />;
  if (user?.role === 'rider')    return <Navigate to="/rider"        replace />;
  return <Navigate to="/"        replace />;
};

// Public rider route — redirect rider to /rider if already logged in
const RiderPublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)          return children;
  if (user?.role === 'rider')    return <Navigate to="/rider"        replace />;
  return <Navigate to="/"        replace />;
};

// Admin only — redirect others
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)          return <Navigate to="/admin/login"  replace />;
  if (user?.role !== 'admin')    return <Navigate to="/"             replace />;
  return children;
};

// Rider only — redirect others
const RiderRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)          return <Navigate to="/rider/login"  replace />;
  if (user?.role !== 'rider')    return <Navigate to="/"             replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────
// Socket initializer (only for authenticated customers)
// ─────────────────────────────────────────────────────────────────────
const SocketInitializer = () => {
  useSocket();
  return null;
};

// ─────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────
const App = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchCartCount }        = useCartStore();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') fetchCartCount();
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      {isAuthenticated && user?.role === 'customer' && <SocketInitializer />}
      <Toaster
        position="top-center"
        toastOptions={{ duration: 3000, style: { fontFamily: 'inherit' } }}
      />

      <Routes>

        {/* ── Public Auth ─────────────────────────────────────────── */}
        <Route
          path="/login"
          element={<PublicRoute><LoginPage /></PublicRoute>}
        />

        {/* ── Customer: New user profile setup ────────────────────── */}
        <Route
          path="/setup-profile"
          element={<CustomerRoute><SetupProfilePage /></CustomerRoute>}
        />

        {/* ── Admin ───────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={<AdminRoute><AdminLayout /></AdminRoute>}
        >
          <Route index                element={<DashboardPage />}      />
          <Route path="orders"        element={<AdminOrdersPage />}    />
          <Route path="riders"        element={<AdminRidersPage />}    />
          <Route path="products"      element={<AdminProductsPage />}  />
          <Route path="coupons"       element={<AdminCouponsPage />}   />
          <Route path="users"         element={<AdminUsersPage />}     />
          <Route path="analytics"     element={<AdminAnalyticsPage />} />
        </Route>

        {/* ── Rider Login ─────────────────────────────────────────── */}
        <Route
          path="/rider/login"
          element={<RiderPublicRoute><RiderLoginPage /></RiderPublicRoute>}
        />

        {/* ── Rider App ───────────────────────────────────────────── */}
        <Route
          path="/rider"
          element={<RiderRoute><RiderLayout /></RiderRoute>}
        >
          <Route index                element={<RiderDashboardPage />} />
          <Route path="order"         element={<RiderOrderPage />}     />
          <Route path="delivery"      element={<RiderDeliveryPage />}  />
          <Route path="history"       element={<RiderHistoryPage />}   />
          <Route path="earnings"      element={<RiderEarningsPage />}  />
          <Route path="profile"       element={<RiderProfilePage />}   />
        </Route>

        {/* ── Customer App ────────────────────────────────────────── */}
        <Route
          path="/"
          element={<CustomerRoute><Layout /></CustomerRoute>}
        >
          <Route index                element={<HomePage />}           />
          <Route path="products"      element={<ProductsPage />}       />
          <Route path="products/:id"  element={<ProductDetailPage />}  />
          <Route path="cart"          element={<CartPage />}           />
          <Route path="checkout"      element={<CheckoutPage />}       />
          <Route path="orders"        element={<OrderHistoryPage />}   />
          <Route path="orders/:id"    element={<OrderTrackingPage />}  />
          <Route path="profile"       element={<ProfilePage />}        />
        </Route>

        {/* ── Fallbacks ───────────────────────────────────────────── */}
        <Route path="/admin/*" element={<Navigate to="/admin"       replace />} />
        <Route path="/rider/*" element={<Navigate to="/rider/login" replace />} />
        <Route path="*"        element={<NotFoundPage />}           />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
