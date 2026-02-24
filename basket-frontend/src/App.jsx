import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import useSocket from '@/hooks/useSocket';

// Pages
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

// Route guard for protected pages
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Route guard — redirect to home if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

// Socket initializer — runs at app level
const SocketInitializer = () => {
  useSocket(); // Establishes connection once when authenticated
  return null;
};

const App = () => {
  const { isAuthenticated } = useAuthStore();
  const { fetchCartCount } = useCartStore();

  // Fetch cart count once on app load if authenticated
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
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* Customer */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/orders/track/:orderId" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
