import { Navigate, Outlet } from 'react-router-dom';
import RiderBottomNav from './RiderBottomNav';
import useAuthStore from '@/store/authStore';
import useRiderSocket from '@/hooks/useRiderSocket';

const RiderLayout = () => {
  const { isAuthenticated, user } = useAuthStore();

  // Initialize rider socket at layout level
  useRiderSocket();

  if (!isAuthenticated || user?.role !== 'rider') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      <div className="pb-20">
        <Outlet />
      </div>
      <RiderBottomNav />
    </div>
  );
};

export default RiderLayout;
