import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import useRiderStore from '@/store/riderStore';

const RiderHistoryPage = () => {
  const { deliveries, deliveriesPagination, isLoadingDeliveries, fetchDeliveries } = useRiderStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDeliveries(1);
  }, []);

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-xl font-extrabold text-gray-900">Delivery History</h1>

      {isLoadingDeliveries && deliveries.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">No deliveries yet</p>
          <p className="text-gray-400 text-sm mt-1">Complete orders to see history</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {deliveries.map((order) => {
              const isDelivered = order.status === 'delivered';
              const date = new Date(order.updatedAt || order.createdAt);
              return (
                <div key={order._id} className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDelivered ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isDelivered
                          ? <CheckCircle size={20} className="text-green-600" />
                          : <XCircle size={20} className="text-red-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order.orderId}</p>
                        <p className="text-xs text-gray-400">
                          {date.toLocaleString('en-IN', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-gray-900">₹{order.grandTotal}</p>
                      <p className={`text-xs font-semibold ${
                        isDelivered ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {isDelivered ? '✓ Delivered' : '✗ Cancelled'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        📍 {order.deliveryAddress?.addressLine}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.items?.length} item{order.items?.length > 1 ? 's' : ''}
                        · {order.paymentMethod?.toUpperCase()}
                      </p>
                    </div>
                    {isDelivered && order.riderEarning > 0 && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        +₹{order.riderEarning}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {deliveriesPagination?.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                isLoading={isLoadingDeliveries}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchDeliveries(next);
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

export default RiderHistoryPage;
