import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/authStore';
import useRiderStore from '@/store/riderStore';
import toast from 'react-hot-toast';

let riderSocket = null;
let locationInterval = null;

const useRiderSocket = () => {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const {
    profile,
    setPendingAssignment,
    fetchActiveOrder,
    updateLocation,
  } = useRiderStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken || user?.role !== 'rider') return;
    if (riderSocket?.connected) return;

    riderSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    riderSocket.on('connect', () => {
      console.log('🏍️ Rider socket connected:', riderSocket.id);
    });

    // New order assigned to this rider
    riderSocket.on('rider:new_assignment', (order) => {
      setPendingAssignment(order);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
      toast(`📦 New order! ₹${order.grandTotal}`, {
        icon: '🛒',
        duration: 30000,
        id: 'new-order',
      });
    });

    // Order was cancelled while rider had it
    riderSocket.on('rider:assignment_cancelled', ({ orderId }) => {
      fetchActiveOrder();
      toast.error(`Order ${orderId} was cancelled`, { duration: 5000 });
    });

    // Order status updated by admin/system
    riderSocket.on('order:status_updated', () => {
      fetchActiveOrder();
    });

    riderSocket.on('disconnect', (reason) => {
      console.log('Rider socket disconnected:', reason);
    });

    riderSocket.on('connect_error', (err) => {
      console.error('Rider socket error:', err.message);
    });

    return () => {
      stopLocationTracking();
    };
  }, [isAuthenticated, accessToken]);

  // ── Location tracking ─────────────────────────────────────────────
  const startLocationTracking = () => {
    if (locationInterval) return;
    if (!navigator.geolocation) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(pos.coords);
          if (riderSocket?.connected) {
            riderSocket.emit('rider:location_update', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          }
        },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    sendLocation(); // Immediate first update
    locationInterval = setInterval(sendLocation, 30000); // Every 30s
  };

  const stopLocationTracking = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      locationInterval = null;
    }
  };

  const disconnectRiderSocket = () => {
    stopLocationTracking();
    if (riderSocket) {
      riderSocket.disconnect();
      riderSocket = null;
    }
  };

  return { riderSocket, startLocationTracking, stopLocationTracking, disconnectRiderSocket };
};

export default useRiderSocket;
