import { useEffect, useState, useRef } from 'react';
import { useNavigate }                 from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Package } from 'lucide-react';
import Button  from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import useRiderStore from '@/store/riderStore';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'packing',          icon: '📦', label: 'Packing'          },
  { key: 'out_for_delivery', icon: '🏍️', label: 'Out for Delivery' },
  { key: 'delivered',        icon: '✅', label: 'Delivered'         },
];

const RiderDeliveryPage = () => {
  const navigate = useNavigate();
  const {
    activeOrder,
    isLoadingActiveOrder,
    fetchActiveOrder,
    updateOrderStatus,
    verifyDeliveryOTP,
  } = useRiderStore();

  const [isUpdating, setIsUpdating] = useState(false);
  const [otp,        setOtp]        = useState(['', '', '', '']);
  const [otpError,   setOtpError]   = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    fetchActiveOrder();
  }, []);

  // Redirect to dashboard if no active order
  useEffect(() => {
    if (!isLoadingActiveOrder && !activeOrder) {
      navigate('/rider', { replace: true });
    }
  }, [activeOrder, isLoadingActiveOrder]);

  const order = activeOrder;
  const currentStepIndex = STEPS.findIndex((s) => s.key === order?.status);

  // ── Mark as Out for Delivery ─────────────────────────────────────
  const handleOutForDelivery = async () => {
    setIsUpdating(true);
    const result = await updateOrderStatus(order._id, 'out_for_delivery');
    setIsUpdating(false);
    if (result.success) {
      toast.success('🏍️ Status updated! OTP sent to customer.');
      fetchActiveOrder();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  // ── OTP digit input handler ──────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setOtpError('');
    const updated = [...otp];
    updated[index] = value.slice(-1); // Only 1 digit per box
    setOtp(updated);
    // Auto-focus next box
    if (value && index < 3) inputRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setOtp(pasted.split(''));
      inputRefs[3].current?.focus();
    }
  };

  // ── Verify OTP → mark delivered ──────────────────────────────────
  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length < 4) {
      setOtpError('Please enter the complete 4-digit OTP');
      return;
    }
    setIsUpdating(true);
    setOtpError('');
    const result = await verifyDeliveryOTP(order._id, otpString);
    setIsUpdating(false);
    if (result.success) {
      toast.success('🎉 Delivery confirmed! Great job.');
      navigate('/rider', { replace: true });
    } else {
      setOtpError(result.error || 'Incorrect OTP. Try again.');
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
    }
  };

  // ── Loading state ────────────────────────────────────────────────
  if (isLoadingActiveOrder && !order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) return null;

  const isOutForDelivery = order.status === 'out_for_delivery';
  const isPacking        = order.status === 'packing';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100
                      px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate('/rider')}
          className="p-1.5 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Active Delivery</h1>
          <p className="text-xs text-gray-400 font-mono">{order.orderId}</p>
        </div>
        <a
          href={`tel:${order.user?.phone}`}
          className="w-9 h-9 rounded-full bg-basket-green flex items-center justify-center"
        >
          <Phone size={16} className="text-white" />
        </a>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 pb-32">

        {/* ── Progress Steps ───────────────────────────────────────── */}
        <div className="card py-5 px-4">
          <div className="relative flex justify-between items-center">
            {/* Track line background */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0" />
            {/* Track line filled */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-basket-green z-0 transition-all duration-500"
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((step, i) => {
              const isDone    = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                   text-base border-2 transition-all shadow-sm
                                   ${isDone
                                     ? 'bg-basket-green border-basket-green text-white'
                                     : 'bg-white border-gray-200 text-gray-300'}
                                   ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''}`}>
                    {isDone && i < currentStepIndex ? '✓' : step.icon}
                  </div>
                  <span className={`text-[10px] font-semibold text-center max-w-[60px] leading-tight
                                    ${isDone ? 'text-basket-green' : 'text-gray-300'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Customer Card ─────────────────────────────────────────── */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-basket-green flex items-center justify-center">
              <span className="text-white font-bold text-base">
                {order.user?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{order.user?.name}</p>
              <p className="text-xs text-gray-400">+91 {order.user?.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${order.user?.phone}`}
              className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"
            >
              <Phone size={18} className="text-basket-green" />
            </a>
          </div>
        </div>

        {/* ── Delivery Address ──────────────────────────────────────── */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={15} className="text-red-500" />
            <span className="text-sm font-bold text-gray-900">Delivery Address</span>
          </div>
          <p className="text-sm text-gray-800">{order.deliveryAddress?.addressLine}</p>
          {order.deliveryAddress?.landmark && (
            <p className="text-xs text-gray-400">Near {order.deliveryAddress.landmark}</p>
          )}
          <p className="text-xs text-gray-400">PIN: {order.deliveryAddress?.pincode}</p>

          {order.deliveryAddress?.location?.coordinates && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.location.coordinates[1]},${order.deliveryAddress.location.coordinates[0]}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5
                         rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              🗺️ Navigate in Google Maps
            </a>
          )}
        </div>

        {/* ── Order Items ───────────────────────────────────────────── */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-basket-green" />
            <span className="text-sm font-bold text-gray-900">
              Items ({order.items?.length})
            </span>
            <span className="ml-auto text-sm font-bold text-gray-900">
              ₹{order.grandTotal}
            </span>
          </div>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between items-center">
              <p className="text-sm text-gray-700">
                {item.name}
                <span className="text-gray-400 ml-1">×{item.quantity}</span>
              </p>
              <p className="text-sm font-semibold text-gray-900">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500">Payment</span>
            <span className={`text-xs font-bold ${
              order.paymentMethod === 'cod' ? 'text-orange-600' : 'text-green-600'
            }`}>
              {order.paymentMethod === 'cod' ? '💵 Collect ₹' + order.grandTotal + ' on delivery' : '✅ Already paid online'}
            </span>
          </div>
        </div>

        {/* ── Phase 10: OTP Verification Section ───────────────────── */}
        {isOutForDelivery && (
          <div className="card space-y-4 border-2 border-basket-green bg-green-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔑</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Enter Customer OTP</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ask the customer for their 4-digit delivery OTP to confirm delivery.
                </p>
              </div>
            </div>

            {/* 4-digit OTP input boxes */}
            <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`w-14 h-14 text-center text-2xl font-extrabold rounded-2xl
                               border-2 outline-none transition-all bg-white
                               focus:border-basket-green focus:ring-2 focus:ring-green-100
                               ${otpError ? 'border-red-400 bg-red-50' : 'border-gray-200'}
                               ${digit ? 'border-basket-green text-basket-green' : 'text-gray-900'}`}
                />
              ))}
            </div>

            {/* Error message */}
            {otpError && (
              <p className="text-center text-sm text-red-500 font-medium">{otpError}</p>
            )}

            {/* Confirm delivery button */}
            <Button
              fullWidth
              size="lg"
              isLoading={isUpdating}
              disabled={otp.join('').length < 4}
              onClick={handleVerifyOTP}
            >
              ✅ Confirm Delivery
            </Button>
          </div>
        )}
      </div>

      {/* ── Sticky bottom CTA ─────────────────────────────────────── */}
      {isPacking && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
                        p-4 max-w-lg mx-auto">
          <Button
            fullWidth
            size="lg"
            isLoading={isUpdating}
            onClick={handleOutForDelivery}
          >
            🏍️ I've Picked Up — Out for Delivery
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">
            This will send the OTP to the customer
          </p>
        </div>
      )}
    </div>
  );
};

export default RiderDeliveryPage;
