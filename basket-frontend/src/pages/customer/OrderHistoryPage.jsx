import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
// ✅ REMOVED: import Layout from '@/components/layout/Layout';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import useOrderStore from '@/store/orderStore';

const STATUS_FILTERS = ['All', 'placed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_BADGE = {
  placed: 'blue', packing: 'orange',
  out_for_delivery: 'orange', delivered: 'green', cancelled: 'red',
};

const STATUS_LABEL = {
  placed: 'Placed', packing: 'Packing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { orders, pagination, isLoading, fetchOrders } = useOrderStore();
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    fetchOrders(1, activeFilter === 'All' ? '' : activeFilter);
  }, [activeFilter]);

  // ✅ REMOVED <Layout> wrapper — Layout is provided by App.jsx router
  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Orders</h1>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
              activeFilter === f
                ? 'bg-basket-green text-white border-basket-green'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {STATUS_LABEL[f] || 'All'}
          </button>
        ))}
      </div>

      {/* Order list */}
      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-5xl">📦</p>
          <p className="text-gray-500 font-medium">No orders found</p>
          <Button onClick={() => navigate('/products')}>Start Shopping</Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/track/${order.orderId}`)}
                className="w-full text-left card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.orderId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={STATUS_BADGE[order.status] || 'gray'} size="sm">
                      {STATUS_LABEL[order.status] || order.status}
                    </Badge>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>

                {/* Item chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                  {order.items?.length > 3 && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">₹{order.grandTotal?.toFixed(2)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    order.paymentMethod === 'upi' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {order.paymentMethod?.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {pagination?.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                isLoading={isLoading}
                onClick={async () => {
                  const next = page + 1;
                  setPage(next);
                  await fetchOrders(next, activeFilter === 'All' ? '' : activeFilter);
                }}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderHistoryPage;
