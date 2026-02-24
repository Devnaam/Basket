import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Star, Package, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import useRiderStore from '@/store/riderStore';
import useAuthStore from '@/store/authStore';
import useRiderSocket from '@/hooks/useRiderSocket';
import toast from 'react-hot-toast';

const RiderProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { profile, isLoadingProfile, fetchProfile } = useRiderStore();
  const { disconnectRiderSocket } = useRiderSocket();

  useEffect(() => { fetchProfile(); }, []);

  const handleLogout = async () => {
    disconnectRiderSocket();
    await logout();
    navigate('/login', { replace: true });
    toast.success('Logged out!');
  };

  if (isLoadingProfile && !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const STATUS_COLORS = {
    available: 'green', busy: 'orange', offline: 'gray',
  };

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-basket-green to-primary-700 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-3xl font-extrabold">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold">{user?.name}</h2>
            <p className="text-green-200 text-sm">+91 {user?.phone}</p>
            <div className="mt-1.5">
              <Badge variant={STATUS_COLORS[profile?.status] || 'gray'}>
                {profile?.status || 'offline'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: <Package size={16} />, label: 'Deliveries', value: profile?.totalDeliveries ?? 0 },
            { icon: <Star size={16} />,    label: 'Rating',     value: `${profile?.rating?.toFixed(1) ?? '—'}★` },
            { icon: <Zap size={16} />,     label: 'On-time %',  value: `${profile?.onTimePercentage ?? 0}%` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white/15 rounded-2xl p-3 text-center">
              <div className="flex justify-center text-green-200 mb-1">{icon}</div>
              <p className="text-base font-extrabold">{value}</p>
              <p className="text-[10px] text-green-200">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle info */}
      {profile && (
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Vehicle Details</h3>
          <div className="space-y-2">
            {[
              { label: 'Vehicle Number', value: profile.vehicleNumber },
              { label: 'Vehicle Type',   value: profile.vehicleType, capitalize: true },
              { label: 'Dark Store',     value: profile.darkStore?.name || '—' },
            ].map(({ label, value, capitalize }) => (
              <div key={label} className="flex justify-between items-center py-1.5">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-semibold text-gray-900 ${capitalize ? 'capitalize' : ''}`}>
                  {value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings summary */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Earnings Summary</h3>
        <div className="space-y-2">
          {[
            { label: "Today",       value: `₹${profile?.earnings?.today?.toFixed(0) ?? 0}` },
            { label: "This Week",   value: `₹${profile?.earnings?.week?.toFixed(0) ?? 0}` },
            { label: "This Month",  value: `₹${profile?.earnings?.month?.toFixed(0) ?? 0}` },
            { label: "All Time",    value: `₹${profile?.earnings?.total?.toFixed(0) ?? 0}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1.5">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-extrabold text-basket-green">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-gray-300">Basket Rider App v1.0.0</p>

      {/* Logout */}
      <Button fullWidth variant="danger" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </Button>

      <div className="h-4" />
    </div>
  );
};

export default RiderProfilePage;
