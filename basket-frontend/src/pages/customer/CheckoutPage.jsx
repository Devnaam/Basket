import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, CreditCard, Plus } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import AddressPicker from '@/components/maps/AddressPicker';  // ← Phase 9
import useAuthStore from '@/store/authStore';
import useOrderStore from '@/store/orderStore';
import useCartStore from '@/store/cartStore';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { user, addAddress } = useAuthStore();
  const { placeOrder } = useOrderStore();
  const { clearCart } = useCartStore();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isPlacing, setIsPlacing] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);   // ← Phase 9

  useEffect(() => {
    if (user?.addresses?.length > 0 && !selectedAddressId) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setSelectedAddressId(def._id);
    }
  }, [user]);

  const { couponCode, grandTotal = 0, deliveryFee = 0, discount = 0, gst = 0 } = routeState || {};

  // ── Dynamically load Razorpay SDK ─────────────────────────────────
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }
    setIsPlacing(true);

    const result = await placeOrder({
      savedAddressId: selectedAddressId,
      paymentMethod,
      couponCode: couponCode || undefined,
    });

    if (!result.success) {
      toast.error(result.error || 'Failed to place order');
      result.details?.forEach((d) => toast.error(d, { duration: 5000 }));
      setIsPlacing(false);
      return;
    }

    const { order, payment } = result.data;

    if (paymentMethod === 'cod') {
      await clearCart();
      toast.success('Order placed! 🎉');
      navigate(`/orders/track/${order.orderId}`, { replace: true });
      return;
    }

    // ── UPI via Razorpay ──────────────────────────────────────────
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Payment gateway unavailable. Try COD.');
      setIsPlacing(false);
      return;
    }

    const rzp = new window.Razorpay({
      key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount:      payment.amount,
      currency:    'INR',
      name:        'Basket',
      description: `Order ${order.orderId}`,
      order_id:    payment.razorpayOrderId,
      handler: async (response) => {
        try {
          const api = (await import('@/api/axios')).default;
          await api.post('/payments/verify', {
            orderId:            order._id,
            razorpayOrderId:    response.razorpay_order_id,
            razorpayPaymentId:  response.razorpay_payment_id,
            razorpaySignature:  response.razorpay_signature,
          });
          await clearCart();
          toast.success('Payment successful! 🎉');
          navigate(`/orders/track/${order.orderId}`, { replace: true });
        } catch (_) {
          toast.error('Payment verification failed. Contact support.');
        }
      },
      prefill: { contact: user?.phone },
      theme:   { color: '#16a34a' },
      modal:   {
        ondismiss: () => {
          setIsPlacing(false);
          toast('Payment cancelled', { icon: '⚠️' });
        },
      },
    });
    rzp.open();
    setIsPlacing(false);
  };

  // ── Phase 9: Handle confirmed address from map picker ─────────────
  const handleAddressConfirmed = async (addressData) => {
    const result = await addAddress(addressData);
    if (result.success) {
      toast.success('📍 Address saved!');
      setShowAddressPicker(false);
      // Auto-select the newly added address
      const updated = useAuthStore.getState().user?.addresses;
      if (updated?.length > 0) {
        setSelectedAddressId(updated[updated.length - 1]._id);
      }
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Layout showBottom={false}>
        <div className="px-4 py-4 space-y-4 pb-36">
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>

          {/* ── Delivery Address ──────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-basket-green" />
                <span className="text-sm font-bold text-gray-900">Delivery Address</span>
              </div>
              <button
                onClick={() => setShowAddressPicker(true)}
                className="flex items-center gap-1 text-basket-green text-xs font-semibold"
              >
                <Plus size={14} /> Add New
              </button>
            </div>

            {user?.addresses?.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-gray-500 text-sm mb-3">No saved addresses</p>
                <Button size="sm" onClick={() => setShowAddressPicker(true)}>
                  📍 Pick on Map
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {user?.addresses?.map((addr) => (
                  <button
                    key={addr._id}
                    onClick={() => setSelectedAddressId(addr._id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                      selectedAddressId === addr._id
                        ? 'border-basket-green bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                        selectedAddressId === addr._id
                          ? 'border-basket-green bg-basket-green'
                          : 'border-gray-300'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{addr.addressLine}</p>
                        {addr.landmark && (
                          <p className="text-xs text-gray-400 mt-0.5">Near {addr.landmark}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">PIN: {addr.pincode}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Payment Method ────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-basket-green" />
              <span className="text-sm font-bold text-gray-900">Payment Method</span>
            </div>
            <div className="space-y-2">
              {[
                { id: 'cod', icon: '💵', label: 'Cash on Delivery',        desc: 'Pay when delivered'  },
                { id: 'upi', icon: '📱', label: 'UPI / Card / NetBanking', desc: 'Secured by Razorpay' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === method.id
                      ? 'border-basket-green bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    paymentMethod === method.id
                      ? 'border-basket-green bg-basket-green'
                      : 'border-gray-300'
                  }`} />
                  <span className="text-lg">{method.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-400">{method.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Order Summary ─────────────────────────────────── */}
          <div className="card space-y-2 text-sm">
            <h3 className="font-bold text-gray-900">Order Summary</h3>
            <div className="flex justify-between text-gray-600">
              <span>Item Total</span>
              <span>₹{(grandTotal - deliveryFee - gst + discount).toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon ({couponCode})</span>
                <span>−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>
                {deliveryFee === 0
                  ? <span className="text-green-600 font-semibold">FREE</span>
                  : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total Payable</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Sticky CTA ────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-lg mx-auto">
          <Button fullWidth size="lg" isLoading={isPlacing} onClick={handlePlaceOrder}>
            {paymentMethod === 'cod' ? '🛒 Place Order' : `💳 Pay ₹${grandTotal.toFixed(2)}`}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">
            ⚡ Estimated delivery in ~20 minutes
          </p>
        </div>
      </Layout>

      {/* ── Phase 9: Full-screen map address picker ───────── */}
      {showAddressPicker && (
        <AddressPicker
          onClose={() => setShowAddressPicker(false)}
          onConfirm={handleAddressConfirmed}
        />
      )}
    </>
  );
};

export default CheckoutPage;
