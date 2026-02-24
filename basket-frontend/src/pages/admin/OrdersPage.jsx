import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import useAdminStore from '@/store/adminStore';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  placed: 'blue', packing: 'orange',
  out_for_delivery: 'orange', delivered: 'green', cancelled: 'red',
};

const STATUS_OPTIONS = ['', 'placed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'];

const OrdersPage = () => {
  const [searchParams] = useSearchParams();
  const { orders, ordersPagination, isLoadingOrders, fetchOrders, assignRider, cancelOrder, riders, fetchRiders } = useAdminStore();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchOrders({ search, status: statusFilter });
    fetchRiders({ status: 'available' });
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders({ search, status: statusFilter });
  };

  const handleAssignRider = async () => {
    if (!selectedRiderId || !selectedOrder) return;
    setIsAssigning(true);
    const result = await assignRider(selectedOrder._id, selectedRiderId);
    setIsAssigning(false);
    if (result.success) {
      toast.success(`Rider assigned to ${selectedOrder.orderId}`);
      setShowAssignModal(false);
      fetchOrders({ search, status: statusFilter });
    } else {
      toast.error(result.error);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.orderId}?`)) return;
    const result = await cancelOrder(order._id, 'Cancelled by admin');
    if (result.success) toast.success('Order cancelled');
    else toast.error(result.error);
  };

  const columns = [
    {
      key: 'orderId', header: 'Order ID', width: '160px',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-800">{row.orderId}</span>
      ),
    },
    {
      key: 'user', header: 'Customer',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.user?.name || '—'}</p>
          <p className="text-xs text-gray-400">{row.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: '140px',
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] || 'gray'}>
          {row.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'rider', header: 'Rider',
      render: (row) => row.rider?.user?.name || (
        <span className="text-gray-400 text-xs">Unassigned</span>
      ),
    },
    {
      key: 'grandTotal', header: 'Amount', width: '100px',
      render: (row) => <span className="font-semibold">₹{row.grandTotal}</span>,
    },
    {
      key: 'paymentMethod', header: 'Payment', width: '80px',
      render: (row) => (
        <span className="text-xs font-semibold uppercase text-gray-500">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Time',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions', width: '160px',
      render: (row) => (
        <div className="flex gap-2">
          {!['delivered', 'cancelled'].includes(row.status) && (
            <button
              onClick={() => { setSelectedOrder(row); setShowAssignModal(true); }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Assign
            </button>
          )}
          {!['delivered', 'cancelled'].includes(row.status) && (
            <button
              onClick={() => handleCancelOrder(row)}
              className="text-xs text-red-500 font-semibold hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800"
            />
          </div>
          <Button type="submit" size="sm">Search</Button>
          <button
            type="button"
            onClick={() => fetchOrders({ search, status: statusFilter })}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </form>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                statusFilter === s
                  ? 'bg-basket-green text-white border-basket-green'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {ordersPagination?.totalItems ?? 0} orders
          </p>
        </div>
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoadingOrders}
          emptyMessage="No orders found"
        />
      </div>

      {/* Assign Rider Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Rider — ${selectedOrder?.orderId}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select an available rider for this order.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {riders.filter((r) => r.status === 'available').map((rider) => (
              <button
                key={rider._id}
                onClick={() => setSelectedRiderId(rider._id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                  selectedRiderId === rider._id
                    ? 'border-basket-green bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  selectedRiderId === rider._id
                    ? 'border-basket-green bg-basket-green'
                    : 'border-gray-300'
                }`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{rider.user?.name}</p>
                  <p className="text-xs text-gray-400">
                    {rider.user?.phone} · ⭐ {rider.rating?.toFixed(1) || 'N/A'} · {rider.totalDeliveries} deliveries
                  </p>
                </div>
              </button>
            ))}
            {riders.filter((r) => r.status === 'available').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No available riders right now</p>
            )}
          </div>
          <Button fullWidth isLoading={isAssigning} onClick={handleAssignRider} disabled={!selectedRiderId}>
            Assign Rider
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersPage;
