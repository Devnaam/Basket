import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Tag, ChevronRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import useCartStore from '@/store/cartStore';
import toast from 'react-hot-toast';

const CartPage = () => {
  const navigate = useNavigate();
  const {
    items, totalAmount, itemCount, isLoading,
    fetchCart, updateQuantity, removeFromCart, validateCoupon,
  } = useCartStore();

  const [couponCode, setCouponCode]   = useState('');
  const [couponData, setCouponData]   = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => { fetchCart(); }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    const result = await validateCoupon(couponCode.trim().toUpperCase(), totalAmount);
    if (result.success) {
      setCouponData({ code: couponCode.toUpperCase(), discount: result.data.discount });
      toast.success(`Coupon applied! You save ₹${result.data.discount} 🎉`);
    } else {
      setCouponError(result.error || 'Invalid coupon');
      setCouponData(null);
    }
    setCouponLoading(false);
  };

  const discount    = couponData?.discount || 0;
  const deliveryFee = (totalAmount - discount) >= 199 ? 0 : 25;
  const gst         = parseFloat(((totalAmount - discount) * 0.05).toFixed(2));
  const grandTotal  = parseFloat((totalAmount - discount + deliveryFee + gst).toFixed(2));

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <span className="text-7xl mb-4">🛒</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-8">Add items to get started</p>
          <Button onClick={() => navigate('/products')}>Browse Products</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottom={false}>
      <div className="px-4 py-4 space-y-4 pb-48">
        <h1 className="text-xl font-bold text-gray-900">
          My Cart <span className="text-gray-400 font-normal text-base">({itemCount})</span>
        </h1>

        {/* Cart items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="card flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img
                  src={item.image || 'https://placehold.co/64x64?text=No+Img'}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=No+Img'; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.quantity} {item.unit}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">₹{item.price}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <div className="flex items-center gap-2 bg-basket-green rounded-lg px-2 py-1.5">
                  <button
                    onClick={() =>
                      item.quantity === 1
                        ? removeFromCart(item.productId)
                        : updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="text-white font-bold text-base w-5 text-center leading-none"
                  >
                    −
                  </button>
                  <span className="text-white text-sm font-bold min-w-[16px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="text-white font-bold text-base w-5 text-center leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-basket-green" />
            <span className="text-sm font-bold text-gray-900">Apply Coupon</span>
          </div>
          {couponData ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-green-700">{couponData.code}</p>
                <p className="text-xs text-green-600">You save ₹{couponData.discount}</p>
              </div>
              <button
                onClick={() => { setCouponData(null); setCouponCode(''); }}
                className="text-red-400 text-xs font-semibold"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="input-field flex-1 text-sm uppercase"
              />
              <Button size="sm" isLoading={couponLoading} onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                Apply
              </Button>
            </div>
          )}
          {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
          <p className="text-xs text-gray-400">Try: WELCOME50 · BASKET10 · FREEDEL</p>
        </div>

        {/* Bill details */}
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Bill Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Item Total</span><span>₹{totalAmount.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon Discount</span><span>−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>
                {deliveryFee === 0 ? (
                  <span>
                    <s className="text-gray-400">₹25</s>
                    <span className="text-green-600 font-semibold ml-1">FREE</span>
                  </span>
                ) : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span><span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          {deliveryFee > 0 && (
            <p className="text-xs text-basket-green font-medium bg-green-50 rounded-lg px-3 py-2">
              Add ₹{Math.max(0, 199 - (totalAmount - discount)).toFixed(0)} more for FREE delivery!
            </p>
          )}
        </div>
      </div>

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-lg mx-auto">
        <Button
          fullWidth
          size="lg"
          onClick={() =>
            navigate('/checkout', {
              state: { couponCode: couponData?.code, grandTotal, deliveryFee, discount, gst },
            })
          }
        >
          Proceed to Checkout · ₹{grandTotal.toFixed(2)} <ChevronRight size={18} />
        </Button>
      </div>
    </Layout>
  );
};

export default CartPage;
