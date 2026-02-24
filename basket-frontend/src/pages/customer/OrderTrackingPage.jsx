import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Package } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import OrderStatusBar from '@/components/order/OrderStatusBar';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import useOrderStore from '@/store/orderStore';
import useSocket from '@/hooks/useSocket';

const STATUS_BADGE = {
  placed: 'blue', packing: 'orange',
  out_for_delivery: 'orange', delivered: 'green', cancelled: 'red',
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { trackedOrder, isLoading, trackOrder, clearTrackedOrder } = useOrderStore();
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
        <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  if (!trackedOrder) {
    return (
      <Layout>
        <div className="text-center py-20 px-6">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-500 font-medium">Order not found</p>
        </div>
      </Layout>
    );
  }

  const order = trackedOrder;
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  const eta = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
      })
    : '~20 min';

  return (
    <Layout showBottom={false}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-1.5 rounded-full hover:bg-gray-100">
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

      <div className="px-4 py-5 space-y-4 pb-8">
        {/* Status progress bar */}
        {!isCancelled && (
          <div className="card py-6 px-2">
            <OrderStatusBar status={order.status} />
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="card bg-red-50 border border-red-100 text-center py-6 space-y-1">
            <p className="text-4xl">❌</p>
            <p className="font-bold text-red-700">Order Cancelled</p>
            {order.cancellationReason && (
              <p className="text-sm text-red-500">{order.cancellationReason}</p>
            )}
          </div>
        )}

        {/* ETA card */}
        {!isDelivered && !isCancelled && (
          <div className="bg-gradient-to-r from-basket-green to-primary-700 rounded-2xl p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-green-200 uppercase font-semibold tracking-wider">
                Estimated Arrival
              </p>
              <p className="text-2xl font-extrabold mt-0.5">{eta}</p>
              <p className="text-xs text-green-200 mt-1">
                {order.status === 'out_for_delivery'
                  ? '🏍️ Rider is heading your way!'
                  : '📦 Preparing your items'}
              </p>
            </div>
            <span className="text-5xl opacity-80">⚡</span>
          </div>
        )}

        {/* Delivered */}
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

        {/* Rider card */}
        {order.rider?.user && !isCancelled && (
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-basket-green flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🏍️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{order.rider.user.name}</p>
              <p className="text-xs text-gray-400">Your delivery partner</p>
            </div>
            <a
              href={`tel:${order.rider.user.phone}`}
              className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"
            >
              <Phone size={18} className="text-basket-green" />
            </a>
          </div>
        )}

        {/* Delivery Address */}
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

        {/* Items list */}
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
                  <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover bg-gray-50" />
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
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Total Paid</span>
            <span className="text-base font-extrabold text-gray-900">
              ₹{order.grandTotal?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderTrackingPage;
