import { Link } from 'react-router-dom';
import { ShoppingCart, MapPin } from 'lucide-react';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';

const Navbar = () => {
  const { itemCount } = useCartStore();
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <span className="text-xl font-extrabold text-basket-green tracking-tight">
            Basket
          </span>
        </Link>

        {/* Location pill */}
        <div className="flex-1 mx-4">
          <Link
            to="/profile"
            className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 max-w-[180px]"
          >
            <MapPin size={14} className="text-basket-green flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate font-medium">
              {user?.addresses?.[0]?.addressLine || 'Set delivery location'}
            </span>
          </Link>
        </div>

        {/* Cart icon with badge */}
        <Link to="/cart" className="relative p-2">
          <ShoppingCart size={24} className="text-gray-700" />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-basket-green text-white
                             text-[10px] font-bold rounded-full w-4 h-4 flex items-center
                             justify-center leading-none">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
