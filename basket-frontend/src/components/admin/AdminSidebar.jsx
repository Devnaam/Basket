import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Users, Bike,
  Package, Tag, BarChart3, LogOut, X,
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import useAdminSocket from '@/hooks/useAdminSocket';

const NAV_ITEMS = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/admin/orders',    icon: ShoppingBag,     label: 'Orders'              },
  { to: '/admin/riders',    icon: Bike,            label: 'Riders'              },
  { to: '/admin/products',  icon: Package,         label: 'Products'            },
  { to: '/admin/coupons',   icon: Tag,             label: 'Coupons'             },
  { to: '/admin/users',     icon: Users,           label: 'Users'               },
  { to: '/admin/analytics', icon: BarChart3,       label: 'Analytics'           },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { disconnectAdminSocket } = useAdminSocket();

  const handleLogout = async () => {
    disconnectAdminSocket();
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50
                    flex flex-col transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="font-extrabold text-white text-base leading-tight">Basket</p>
              <p className="text-xs text-gray-400 leading-tight">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-basket-green text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-gray-800 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm
                       font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
