import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Wallet, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/rider',          icon: Home,          label: 'Home',    end: true },
  { to: '/rider/history',  icon: ClipboardList, label: 'History'           },
  { to: '/rider/earnings', icon: Wallet,        label: 'Earnings'          },
  { to: '/rider/profile',  icon: User,          label: 'Profile'           },
];

const RiderBottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 max-w-lg mx-auto">
    <div className="flex">
      {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive ? 'text-basket-green' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-basket-green' : 'text-gray-400'}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default RiderBottomNav;
