import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import useAuthStore from '@/store/authStore';
import useAdminSocket from '@/hooks/useAdminSocket';

// Page title map
const PAGE_TITLES = {
  '/admin':           'Dashboard',
  '/admin/orders':    'Orders',
  '/admin/riders':    'Riders',
  '/admin/products':  'Products',
  '/admin/coupons':   'Coupons',
  '/admin/users':     'Users',
  '/admin/analytics': 'Analytics',
};

const AdminLayout = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize admin socket at layout level
  useAdminSocket();

  // Guard: must be admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            >
              <Menu size={22} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500 hidden sm:block">Live</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-basket-green flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
