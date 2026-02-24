import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import useAdminStore from '@/store/adminStore';

const STATUS_BADGE = {
  placed: 'blue', packing: 'orange',
  out_for_delivery: 'orange', delivered: 'green', cancelled: 'red',
};

const LiveOrderFeed = () => {
  const navigate = useNavigate();
  const { liveOrders, metrics, fetchMetrics } = useAdminStore();

  // Seed the feed from recent orders on mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Show live feed OR fallback to recent orders from metrics
  const displayOrders = liveOrders.length > 0
    ? liveOrders
    : (metrics?.recentOrders || []);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">Live Order Feed</h3>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <span className="text-xs text-gray-400">{displayOrders.length} orders</span>
      </div>

      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {displayOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No recent orders
          </div>
        ) : (
          displayOrders.map((order) => (
            <button
              key={order._id || order.orderId}
              onClick={() => navigate(`/admin/orders?search=${order.orderId}`)}
              className="w-full flex items-center justify-between px-4 py-3
                         hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {order.orderId}
                  </p>
                  <Badge variant={STATUS_BADGE[order.status] || 'gray'} size="sm">
                    {order.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {order.user?.name || 'Customer'} ·{' '}
                  {order.paymentMethod?.toUpperCase()}
                </p>
              </div>
              <p className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                ₹{order.grandTotal}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveOrderFeed;
