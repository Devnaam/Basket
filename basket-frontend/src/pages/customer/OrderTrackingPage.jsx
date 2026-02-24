import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Package } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import useOrderStore from '@/store/orderStore';
import useSocket from '@/hooks/useSocket';

const STATUS_STEPS = [
  { key: 'placed',           label: 'Order Placed',      icon: '🛒' },
  { key: 'packing',          label: 'Packing',            icon: '📦' },
  { key: 'out_for_delivery', label: 'Out for Delivery',   icon: '🏍️' },
  { key: 'delivered',        label: 'Delivered',          icon: '✅' },
];

const STATUS_ORDER = ['placed', 'packing', 'out_for_delivery', 'delivered'];

const STATUS_BADGE = {
  placed:           'blue',
  packing:          'orange',
  out_for_delivery: 'orange',
  delivered:        'green',
  cancelled:        'red',
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const {
    trackedOrder,
    riderLocation,     // ← Phase 9: live GPS { lat, lng }
    isLoading,
    trackOrder,
    clearTrackedOrder,
  } = useOrderStore();
  const { joinOrderRoom, leaveOrderRoom } = useSocket();

  useEffect(() => {
    if (!orderId) return;
    trackOrder(orderId);
    joinOrderRoom(orderId);
    return () => {
      leaveOrderRoom(orderId);
      clearTrackedOrder();
    };
  }, [orderId]);

  if (isLoading && !trackedOrder) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!trackedOrder) {
    return (
      <Layout>
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-500 font-medium">Order not found</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-basket-green text-sm font-semibold"
          >
            Back to Orders
          </button>
        </div>
      </Layout>
    );
  }

  const order = trackedOrder;
  const isDelivered   = order.status === 'delivered';
  const isCancelled   = order.status === 'cancelled';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const currentStep   = STATUS_ORDER.indexOf(order.status);

  // Phase 9: convert store's { lat, lng } → { latitude, longitude } for LiveTrackingMap
  const mappedRiderLocation = riderLocation
    ? { latitude: riderLocation.lat, longitude: riderLocation.lng }
    : null;

  const showMap = !isCancelled && (isOutForDelivery || isDelivered);

  const eta = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
      })
    : '~20 min';

  return (
    <Layout showBottom={false}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-1.5 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Track Order</h1>
          <p className="text-xs text-gray-400">{order.orderId}</p>
        </div>
        <Badge variant={STATUS_BADGE[order.status] || 'gray'}>
          {order.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="px-4 py-5 space-y-4 pb-10">

        {/* ── Cancelled banner ──────────────────────────────── */}
        {isCancelled && (
          <div className="card bg-red-50 border border-red-100 text-center py-6 space-y-1">
            <p className="text-4xl">❌</p>
            <p className="font-bold text-red-700">Order Cancelled</p>
            {order.cancellationReason && (
              <p className="text-sm text-red-500">{order.cancellationReason}</p>
            )}
          </div>
        )}

        {/* ── Progress steps ────────────────────────────────── */}
        {!isCancelled && (
          <div className="card py-5 px-4">
            <div className="relative flex justify-between items-center">
              {/* Progress track line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0" />
              <div
                className="absolute top-5 left-0 h-0.5 bg-basket-green z-0 transition-all duration-500"
                style={{ width: `${(currentStep / (STATUS_ORDER.length - 1)) * 100}%` }}
              />

              {STATUS_STEPS.map((step, i) => {
                const isDone    = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base
                                    border-2 transition-all shadow-sm
                                    ${isDone
                                      ? 'bg-basket-green border-basket-green text-white'
                                      : 'bg-white border-gray-200 text-gray-300'
                                    }
                                    ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''}`}>
                      {isDone ? (i < currentStep ? '✓' : step.icon) : step.icon}
                    </div>
                    <span className={`text-[10px] font-semibold text-center leading-tight
                                      max-w-[60px] ${isDone ? 'text-basket-green' : 'text-gray-300'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIVE TRACKING MAP (Phase 9) ───────────────────── */}
        {showMap && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-900">Live Location</h3>
              {isOutForDelivery && (
                <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Updating live
                </span>
              )}
            </div>
            <LiveTrackingMap order={order} riderLocation={mappedRiderLocation} />
          </div>
        )}

        {/* ── ETA card ──────────────────────────────────────── */}
        {!isDelivered && !isCancelled && (
          <div className="bg-gradient-to-r from-basket-green to-primary-700 rounded-2xl p-5 text-white
                          flex items-center justify-between">
            <div>
              <p className="text-xs text-green-200 uppercase font-semibold tracking-wider">
                Estimated Arrival
              </p>
              <p className="text-3xl font-extrabold mt-0.5">{eta}</p>
              <p className="text-xs text-green-200 mt-1">
                {isOutForDelivery ? '🏍️ Rider is heading your way!' : '📦 Preparing your items'}
              </p>
            </div>
            <span className="text-5xl opacity-80">⚡</span>
          </div>
        )}

        {/* ── Delivered banner ──────────────────────────────── */}
        {isDelivered && (
          <div className="card bg-green-50 border border-green-100 text-center py-5 space-y-1">
            <p className="text-4xl">🎉</p>
            <p className="font-bold text-green-700">Order Delivered!</p>
            {order.deliveredAt && (
              <p className="text-xs text-green-600">
                at {new Date(order.deliveredAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}

        {/* ── OTP notice (shows when out for delivery) ──────── */}
        {isOutForDelivery && (
          <div className="card bg-amber-50 border border-amber-100 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🔑</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Your Delivery OTP</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Check the notification banner — share the 4-digit OTP with your rider to confirm delivery.
              </p>
            </div>
          </div>
        )}

        {/* ── Rider card ────────────────────────────────────── */}
        {order.rider?.user && !isCancelled && (
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-basket-green flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🏍️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{order.rider.user.name}</p>
              <p className="text-xs text-gray-400">Your delivery partner</p>
              {order.rider.rating && (
                <p className="text-xs text-amber-500 mt-0.5">
                  ⭐ {order.rider.rating.toFixed(1)} rating
                </p>
              )}
            </div>
            <a
              href={`tel:${order.rider.user.phone}`}
              className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center"
            >
              <Phone size={18} className="text-basket-green" />
            </a>
          </div>
        )}

        {/* ── Delivery address ──────────────────────────────── */}
        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📍</span>
            <span className="text-sm font-bold text-gray-900">Delivery Address</span>
          </div>
          <p className="text-sm text-gray-700">{order.deliveryAddress?.addressLine}</p>
          {order.deliveryAddress?.landmark && (
            <p className="text-xs text-gray-400">Near {order.deliveryAddress.landmark}</p>
          )}
          <p className="text-xs text-gray-400">PIN: {order.deliveryAddress?.pincode}</p>
        </div>

        {/* ── Items list ────────────────────────────────────── */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-basket-green" />
            <span className="text-sm font-bold text-gray-900">
              Items ({order.items?.length})
            </span>
          </div>
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
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center text-sm font-bold text-gray-900">
            <span>Total Paid</span>
            <span>₹{order.grandTotal?.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 text-right">
            via {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '📱 Online Payment'}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default OrderTrackingPage;
