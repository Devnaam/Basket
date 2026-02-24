import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import useAdminStore from '@/store/adminStore';
import toast from 'react-hot-toast';
import api from '@/api/axios';

const DARK_STORE_ID_DEFAULT = ''; // Will be fetched

const RidersPage = () => {
  const { riders, ridersPagination, isLoadingRiders, fetchRiders, toggleRider, onboardRider, fetchRiderPerformance } = useAdminStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [darkStores, setDarkStores] = useState([]);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', vehicleNumber: '',
    vehicleType: 'bike', darkStoreId: '',
  });

  useEffect(() => {
    fetchRiders({ status: statusFilter });
    // Fetch dark stores for the onboard modal
    api.get('/products/dark-stores').then(({ data }) => {
      setDarkStores(data.data || []);
      if (data.data?.length > 0) {
        setForm((f) => ({ ...f, darkStoreId: data.data[0]._id }));
      }
    }).catch(() => {});
  }, [statusFilter]);

  const handleToggle = async (rider) => {
    const action = rider.isActive ? 'block' : 'unblock';
    if (!window.confirm(`${action} rider ${rider.user?.name}?`)) return;
    const result = await toggleRider(rider._id);
    if (result.success) toast.success(result.message);
    else toast.error(result.error);
  };

  const handleOnboard = async () => {
    if (!form.name || !form.phone || !form.vehicleNumber || !form.darkStoreId) {
      toast.error('All fields are required');
      return;
    }
    setIsOnboarding(true);
    const result = await onboardRider(form);
    setIsOnboarding(false);
    if (result.success) {
      toast.success(`Rider ${form.name} onboarded! Login via OTP: ${form.phone}`);
      setShowOnboardModal(false);
      setForm({ name: '', phone: '', vehicleNumber: '', vehicleType: 'bike', darkStoreId: form.darkStoreId });
      fetchRiders({ status: statusFilter });
    } else {
      toast.error(result.error);
    }
  };

  const handleViewPerformance = async (riderId) => {
    setPerfData(null);
    setShowPerfModal(true);
    const result = await fetchRiderPerformance(riderId);
    if (result.success) setPerfData(result.data);
    else toast.error(result.error);
  };

  const STATUS_BADGE_MAP = {
    available: 'green', busy: 'orange', offline: 'gray',
  };

  const columns = [
    {
      key: 'name', header: 'Rider',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{row.user?.name}</p>
          <p className="text-xs text-gray-400">{row.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: '110px',
      render: (row) => (
        <Badge variant={STATUS_BADGE_MAP[row.status] || 'gray'}>{row.status}</Badge>
      ),
    },
    {
      key: 'vehicle', header: 'Vehicle',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-700">{row.vehicleNumber}</p>
          <p className="text-xs text-gray-400 capitalize">{row.vehicleType}</p>
        </div>
      ),
    },
    {
      key: 'rating', header: 'Rating', width: '80px',
      render: (row) => (
        <span className="font-semibold text-yellow-500">
          ⭐ {row.rating?.toFixed(1) || 'N/A'}
        </span>
      ),
    },
    {
      key: 'totalDeliveries', header: 'Deliveries', width: '100px',
      render: (row) => <span className="font-semibold">{row.totalDeliveries}</span>,
    },
    {
      key: 'earnings', header: 'Earnings',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-gray-900">₹{row.earnings?.total?.toFixed(0) || 0} total</p>
          <p className="text-gray-400">₹{row.earnings?.today?.toFixed(0) || 0} today</p>
        </div>
      ),
    },
    {
      key: 'isActive', header: 'Active', width: '80px',
      render: (row) => (
        <span className={`text-xs font-semibold ${row.isActive ? 'text-green-600' : 'text-red-500'}`}>
          {row.isActive ? '✅ Active' : '🚫 Blocked'}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions', width: '160px',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewPerformance(row._id)}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Stats
          </button>
          <button
            onClick={() => handleToggle(row)}
            className={`text-xs font-semibold hover:underline ${
              row.isActive ? 'text-red-500' : 'text-green-600'
            }`}
          >
            {row.isActive ? 'Block' : 'Unblock'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'available', 'busy', 'offline'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                statusFilter === s
                  ? 'bg-basket-green text-white border-basket-green'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchRiders({ status: statusFilter })}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw size={15} className="text-gray-500" />
          </button>
          <Button size="sm" onClick={() => setShowOnboardModal(true)}>
            + Onboard Rider
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <p className="text-sm text-gray-500 mb-3">{ridersPagination?.totalItems ?? riders.length} riders</p>
        <DataTable columns={columns} data={riders} isLoading={isLoadingRiders} />
      </div>

      {/* Onboard Modal */}
      <Modal isOpen={showOnboardModal} onClose={() => setShowOnboardModal(false)} title="Onboard New Rider">
        <div className="space-y-3">
          <Input label="Full Name" name="name" value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Rahul Kumar" />
          <Input label="Phone Number" name="phone" type="tel" value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            placeholder="9876543210" prefix="+91" />
          <Input label="Vehicle Number" name="vehicleNumber" value={form.vehicleNumber}
            onChange={(e) => setForm((p) => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
            placeholder="AP28CX1234" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Vehicle Type</label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm((p) => ({ ...p, vehicleType: e.target.value }))}
              className="input-field"
            >
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="bicycle">Bicycle</option>
              <option value="ev_bike">EV Bike</option>
            </select>
          </div>
          {darkStores.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Dark Store</label>
              <select
                value={form.darkStoreId}
                onChange={(e) => setForm((p) => ({ ...p, darkStoreId: e.target.value }))}
                className="input-field"
              >
                {darkStores.map((ds) => (
                  <option key={ds._id} value={ds._id}>{ds.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button fullWidth isLoading={isOnboarding} onClick={handleOnboard}>
            Onboard Rider
          </Button>
        </div>
      </Modal>

      {/* Performance Modal */}
      <Modal isOpen={showPerfModal} onClose={() => setShowPerfModal(false)} title="Rider Performance">
        {!perfData ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-basket-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Deliveries', value: perfData.lifetime?.totalDeliveries },
                { label: 'Rating', value: `⭐ ${perfData.lifetime?.rating?.toFixed(1) || 'N/A'}` },
                { label: 'On-time %', value: `${perfData.lifetime?.onTimePercentage || 0}%` },
                { label: 'Total Earnings', value: `₹${perfData.lifetime?.earnings?.total?.toFixed(0) || 0}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Last 30 Days</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-bold text-gray-900">{perfData.last30Days?.deliveries}</p>
                  <p className="text-xs text-gray-400">Deliveries</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">⭐ {perfData.last30Days?.avgRating || 'N/A'}</p>
                  <p className="text-xs text-gray-400">Avg Rating</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">₹{perfData.last30Days?.earnings}</p>
                  <p className="text-xs text-gray-400">Earnings</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RidersPage;
