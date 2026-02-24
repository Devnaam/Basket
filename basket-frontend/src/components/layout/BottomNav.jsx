import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/products', icon: Search, label: 'Browse' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => (
  <nav className="bottom-nav">
    <div className="max-w-lg mx-auto flex items-center justify-around h-16">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
              isActive
                ? 'text-basket-green'
                : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default BottomNav;
