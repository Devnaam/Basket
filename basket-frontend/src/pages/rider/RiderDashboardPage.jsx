import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Package } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import useRiderStore from '@/store/riderStore';
import useRiderSocket from '@/hooks/useRiderSocket';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  offline:   { label: 'Offline',   color: 'bg-gray-400',     text: 'text-gray-600',   bg: 'bg-gray-100'   },
  available: { label: 'Online',    color: 'bg-green-500',    text: 'text-green-700',  bg: 'bg-green-50'   },
  busy:      { label: 'On Delivery', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50'  },
};

const RiderDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    profile, activeOrder, pendingAssignment, isLoadingProfile,
    isLoadingActiveOrder, fetchProfile, fetchActiveOrder,
    toggleStatus, updateOrderStatus, setPendingAssignment,
    clearPendingAssignment,
  } = useRiderStore();

  const { startLocationTracking, stopLocationTracking } = useRiderSocket();
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchActiveOrder();
  }, []);

  // Start location tracking when rider goes online
  useEffect(() => {
    const status = profile?.status;
    if (status === 'available' || status === 'busy') {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [profile?.status]);

  const handleToggleOnline = async () => {
    const currentStatus = profile?.status;
    const newStatus = currentStatus === 'offline' ? 'available' : 'offline';
    setIsToggling(true);
    const result = await toggleStatus(newStatus);
    setIsToggling(false);
    if (result.success) {
      toast.success(newStatus === 'available' ? '✅ You are now Online!' : '🔴 You are Offline');
    } else {
      toast.error(result.error);
    }
  };

  const handleAcceptOrder = async () => {
    if (!pendingAssignment) return;
    const result = await updateOrderStatus(pendingAssignment._id, 'accepted');
    clearPendingAssignment();
    toast.dismiss('new-order');
    if (result.success) {
      toast.success('Order accepted!');
      fetchActiveOrder();
    } else {
      toast.error(result.error || 'Failed to accept order');
    }
  };

  const handleRejectOrder = async () => {
    clearPendingAssignment();
    toast.dismiss('new-order');
    toast('Order declined', { icon: '↩️' });
  };

  const isOnline = profile?.status !== 'offline';
  const statusCfg = STATUS_CONFIG[profile?.status || 'offline'];

  if (isLoadingProfile && !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Hey {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Ready to deliver?</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full ${statusCfg.bg} flex items-center gap-1.5`}>
          <span className={`w-2 h-2 rounded-full ${statusCfg.color} ${isOnline ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-bold ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>
      </div>

      {/* Online/Offline toggle */}
      <div className={`rounded-3xl p-6 text-center transition-all ${
        isOnline
          ? 'bg-gradient-to-br from-basket-green to-primary-700'
          : 'bg-gray-800'
      }`}>
        <p className={`text-sm font-semibold mb-4 ${isOnline ? 'text-green-100' : 'text-gray-400'}`}>
          {isOnline ? '⚡ Accepting orders' : '💤 Not accepting orders'}
        </p>
        <button
          onClick={handleToggleOnline}
          disabled={isToggling || activeOrder != null}
          className={`w-28 h-28 rounded-full text-4xl border-4 font-bold transition-all
                      active:scale-95 disabled:opacity-60 shadow-2xl
                      ${isOnline
                        ? 'bg-white border-green-200 text-basket-green'
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                      }`}
        >
          {isToggling ? '...' : isOnline ? '🟢' : '⭕'}
        </button>
        <p className={`text-base font-bold mt-4 ${isOnline ? 'text-white' : 'text-gray-400'}`}>
          {isToggling ? 'Updating...' : isOnline ? 'Tap to go Offline' : 'Tap to go Online'}
        </p>
        {activeOrder && (
          <p className="text-xs text-green-200 mt-1">Finish current delivery to go offline</p>
        )}
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '📦', label: 'Today',    value: profile?.deliveriesToday ?? 0 },
          { icon: '⭐', label: 'Rating',   value: profile?.rating?.toFixed(1) ?? '—' },
          { icon: '💰', label: 'Earnings', value: `₹${profile?.earningsToday?.toFixed(0) ?? 0}` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-card border border-gray-100">
            <p className="text-xl mb-0.5">{icon}</p>
            <p className="text-lg font-extrabold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Active Order card */}
      {isLoadingActiveOrder && !activeOrder ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : activeOrder ? (
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
          {/* Status banner */}
          <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <p className="text-white text-sm font-bold capitalize">
              Active: {activeOrder.status?.replace(/_/g, ' ')}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Order ID + amount */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Order ID</p>
                <p className="font-mono font-bold text-gray-900">{activeOrder.orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-lg font-extrabold text-gray-900">₹{activeOrder.grandTotal}</p>
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-basket-green flex items-center justify-center">
                  <span className="text-white font-bold">
                    {activeOrder.user?.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{activeOrder.user?.name}</p>
                  <p className="text-xs text-gray-400">Customer</p>
                </div>
              </div>
              <a
                href={`tel:${activeOrder.user?.phone}`}
                className="w-10 h-10 rounded-full bg-basket-green flex items-center justify-center"
              >
                <Phone size={18} className="text-white" />
              </a>
            </div>

            {/* Delivery address */}
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {activeOrder.deliveryAddress?.addressLine}
                </p>
                {activeOrder.deliveryAddress?.landmark && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Near {activeOrder.deliveryAddress.landmark}
                  </p>
                )}
                <p className="text-xs text-gray-400">PIN: {activeOrder.deliveryAddress?.pincode}</p>
              </div>
            </div>

            {/* Items summary */}
            <div className="flex items-center gap-2">
              <Package size={14} className="text-gray-400" />
              <p className="text-xs text-gray-500">
                {activeOrder.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
              </p>
            </div>

            {/* Navigation button */}
            {activeOrder.deliveryAddress?.location?.coordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${
                  activeOrder.deliveryAddress.location.coordinates[1]
                },${activeOrder.deliveryAddress.location.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl
                           bg-blue-600 text-white text-sm font-bold"
              >
                🗺️ Open in Google Maps
              </a>
            )}

            {/* Action button */}
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/rider/order')}
            >
              View Full Order Details →
            </Button>
          </div>
        </div>
      ) : isOnline ? (
        <div className="bg-white rounded-3xl p-8 text-center shadow-card border border-gray-100">
          <p className="text-5xl mb-3">🛵</p>
          <p className="text-base font-bold text-gray-900">Ready for orders!</p>
          <p className="text-sm text-gray-400 mt-1">
            New orders will appear here automatically
          </p>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-3xl p-8 text-center">
          <p className="text-5xl mb-3">💤</p>
          <p className="text-base font-bold text-gray-500">You are offline</p>
          <p className="text-sm text-gray-400 mt-1">Go online to start receiving orders</p>
        </div>
      )}

      {/* Pending Assignment Modal */}
      <Modal
        isOpen={!!pendingAssignment}
        onClose={handleRejectOrder}
        title="🛒 New Order Assigned!"
      >
        {pendingAssignment && (
          <div className="space-y-4">
            {/* Order overview */}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order</span>
                <span className="font-mono font-bold text-gray-900">{pendingAssignment.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount</span>
                <span className="text-lg font-extrabold text-basket-green">
                  ₹{pendingAssignment.grandTotal}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment</span>
                <span className="text-sm font-semibold uppercase text-gray-700">
                  {pendingAssignment.paymentMethod}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Items</p>
              {pendingAssignment.items?.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  • {item.name} ×{item.quantity}
                </p>
              ))}
            </div>

            {/* Delivery address */}
            <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
              <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {pendingAssignment.deliveryAddress?.addressLine}
                </p>
                <p className="text-xs text-gray-400">
                  PIN: {pendingAssignment.deliveryAddress?.pincode}
                </p>
              </div>
            </div>

            {/* Accept/Reject */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRejectOrder}
                className="py-3 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-sm"
              >
                ✕ Decline
              </button>
              <Button onClick={handleAcceptOrder}>
                ✓ Accept
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RiderDashboardPage;
