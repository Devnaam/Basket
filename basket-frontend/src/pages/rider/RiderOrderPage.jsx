import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Package, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import useRiderStore from '@/store/riderStore';
import toast from 'react-hot-toast';

// Step flow: accepted → picked_up → out_for_delivery → [OTP] → delivered
const STATUS_STEPS = [
  { key: 'accepted',           label: 'Order Accepted',      icon: '✅', done: ['accepted', 'picked_up', 'out_for_delivery', 'delivered'] },
  { key: 'picked_up',          label: 'Picked Up from Store', icon: '📦', done: ['picked_up', 'out_for_delivery', 'delivered'] },
  { key: 'out_for_delivery',   label: 'Out for Delivery',    icon: '🏍️', done: ['out_for_delivery', 'delivered'] },
  { key: 'delivered',          label: 'Delivered',           icon: '🎉', done: ['delivered'] },
];

const NEXT_ACTION = {
  accepted:         { label: '📦 Mark as Picked Up',        next: 'picked_up'        },
  picked_up:        { label: '🏍️ Start Delivery',           next: 'out_for_delivery' },
  out_for_delivery: { label: '🔑 Enter Delivery OTP',       next: 'otp'              },
};

const RiderOrderPage = () => {
  const navigate = useNavigate();
  const {
    activeOrder, isLoadingActiveOrder,
    fetchActiveOrder, updateOrderStatus, verifyDeliveryOTP,
  } = useRiderStore();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    fetchActiveOrder();
  }, []);

  if (isLoadingActiveOrder && !activeOrder) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-6xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-gray-900">No Active Order</h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">All deliveries completed!</p>
        <Button onClick={() => navigate('/rider')}>Back to Dashboard</Button>
      </div>
    );
  }

  const order = activeOrder;
  const currentStatus = order.status;
  const action = NEXT_ACTION[currentStatus];

  const handleStatusUpdate = async () => {
    if (!action) return;
    if (action.next === 'otp') { setShowOtpModal(true); return; }

    setIsUpdating(true);
    const result = await updateOrderStatus(order._id, action.next);
    setIsUpdating(false);

    if (result.success) {
      toast.success(`Status updated: ${action.next.replace(/_/g, ' ')}`);
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) { setOtpError('Enter the 4-digit OTP'); return; }
    setOtpError('');
    setIsUpdating(true);
    const result = await verifyDeliveryOTP(order._id, otp);
    setIsUpdating(false);

    if (result.success) {
      setShowOtpModal(false);
      toast.success('🎉 Delivery confirmed! Great job!');
      navigate('/rider', { replace: true });
    } else {
      setOtpError(result.error || 'Invalid OTP. Ask customer for correct OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate('/rider')} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Active Delivery</h1>
          <p className="text-xs text-gray-400">{order.orderId}</p>
        </div>
        <Badge variant="orange">{currentStatus?.replace(/_/g, ' ')}</Badge>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Progress steps */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Delivery Progress</h3>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const isDone = step.done.includes(currentStatus);
              const isCurrent = step.key === currentStatus;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                                  transition-all ${
                                    isDone
                                      ? 'bg-basket-green text-white'
                                      : isCurrent
                                        ? 'bg-orange-100 text-orange-600 border-2 border-orange-400'
                                        : 'bg-gray-100 text-gray-400'
                                  }`}>
                    {isDone ? '✓' : step.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs text-orange-500 font-bold animate-pulse">NOW</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer card */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Customer</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-basket-green flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {order.user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{order.user?.name}</p>
                <p className="text-xs text-gray-400">+91 {order.user?.phone}</p>
              </div>
            </div>
            <a
              href={`tel:${order.user?.phone}`}
              className="w-11 h-11 rounded-full bg-basket-green flex items-center justify-center"
            >
              <Phone size={18} className="text-white" />
            </a>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Delivery Address</h3>
          <div className="flex items-start gap-2 mb-3">
            <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{order.deliveryAddress?.addressLine}</p>
              {order.deliveryAddress?.landmark && (
                <p className="text-xs text-gray-400 mt-0.5">Near {order.deliveryAddress.landmark}</p>
              )}
              <p className="text-xs text-gray-400">PIN: {order.deliveryAddress?.pincode}</p>
            </div>
          </div>
          {order.deliveryAddress?.location?.coordinates && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${
                order.deliveryAddress.location.coordinates[1]
              },${order.deliveryAddress.location.coordinates[0]}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                         bg-blue-600 text-white text-sm font-bold"
            >
              🗺️ Navigate in Google Maps
            </a>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-basket-green" />
            <h3 className="text-sm font-bold text-gray-900">
              Order Items ({order.items?.length})
            </h3>
          </div>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.image && (
                    <img src={item.image} alt={item.name}
                      className="w-9 h-9 rounded-lg object-cover bg-gray-50" />
                  )}
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">×{item.quantity}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="h-px bg-gray-100 mt-3 mb-2" />
          <div className="flex justify-between text-sm font-bold text-gray-900">
            <span>Total</span>
            <span>₹{order.grandTotal}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            {order.paymentMethod === 'cod'
              ? '💵 Collect cash from customer'
              : '✅ Already paid online'}
          </p>
        </div>
      </div>

      {/* Sticky action button */}
      {action && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-lg mx-auto">
          <Button
            fullWidth
            size="lg"
            isLoading={isUpdating}
            onClick={handleStatusUpdate}
          >
            {action.label}
          </Button>
        </div>
      )}

      {/* OTP Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => { setShowOtpModal(false); setOtp(''); setOtpError(''); }}
        title="Confirm Delivery"
      >
        <div className="space-y-4">
          <div className="text-center bg-green-50 rounded-2xl p-4">
            <p className="text-4xl mb-2">🔑</p>
            <p className="text-sm font-medium text-gray-700">
              Ask the customer for their 4-digit delivery OTP to confirm delivery.
            </p>
          </div>
          <Input
            label="Customer OTP"
            name="otp"
            type="number"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
          />
          {otpError && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{otpError}</p>
          )}
          <Button
            fullWidth
            size="lg"
            isLoading={isUpdating}
            onClick={handleVerifyOTP}
            disabled={otp.length !== 4}
          >
            ✅ Confirm Delivery
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default RiderOrderPage;
