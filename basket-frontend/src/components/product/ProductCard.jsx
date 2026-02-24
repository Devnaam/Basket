import { Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import Badge from '@/components/ui/Badge';

const ProductCard = ({ product }) => {
  const { addToCart, updateQuantity, removeFromCart, getItemQuantity } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const quantity = getItemQuantity(product._id);

  const discount = product.discountPercent ||
    (product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    addToCart(product._id, 1, product.name);
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    updateQuantity(product._id, quantity + 1);
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    if (quantity === 1) removeFromCart(product._id);
    else updateQuantity(product._id, quantity - 1);
  };

  return (
    <Link to={`/products/${product._id}`} className="block">
      <div className="card hover:shadow-md transition-shadow duration-200 relative">
        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="green">{discount}% OFF</Badge>
          </div>
        )}

        {/* Product image */}
        <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
          <img
            src={product.images?.[0]}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://placehold.co/200x200?text=No+Image';
            }}
          />
        </div>

        {/* Product info */}
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium">{product.quantity} {product.unit}</p>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
            )}
          </div>
        </div>

        {/* Add to cart / Quantity control */}
        <div className="mt-3" onClick={(e) => e.preventDefault()}>
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-full py-2 border-2 border-basket-green text-basket-green text-sm
                         font-semibold rounded-xl flex items-center justify-center gap-1
                         active:scale-95 transition-all disabled:opacity-40 disabled:border-gray-300
                         disabled:text-gray-300"
            >
              {product.stock === 0 ? 'Out of Stock' : (
                <><Plus size={16} /> Add</>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-basket-green rounded-xl px-2 py-1.5">
              <button
                onClick={handleDecrease}
                className="w-7 h-7 flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <Minus size={16} />
              </button>
              <span className="text-white font-bold text-sm min-w-[20px] text-center">
                {quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="w-7 h-7 flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
