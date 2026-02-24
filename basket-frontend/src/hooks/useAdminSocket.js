import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/authStore';
import useAdminStore from '@/store/adminStore';
import toast from 'react-hot-toast';

let adminSocket = null;

const useAdminSocket = () => {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const { pushLiveOrder, updateLiveOrder } = useAdminStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken || user?.role !== 'admin') return;
    if (adminSocket?.connected) return;

    adminSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    adminSocket.on('connect', () => {
      console.log('👑 Admin socket connected:', adminSocket.id);
    });

    // ── New order arrives ──────────────────────────────────────────
    adminSocket.on('admin:new_order', (order) => {
      pushLiveOrder(order);
      toast(`New order ${order.orderId} · ₹${order.grandTotal}`, {
        icon: '🛒', duration: 5000,
      });
    });

    // ── Order status updated ───────────────────────────────────────
    adminSocket.on('admin:order_updated', ({ orderId, status }) => {
      updateLiveOrder(orderId, { status });
    });

    // ── No rider available ────────────────────────────────────────
    adminSocket.on('admin:no_rider_available', ({ orderIdFormatted }) => {
      toast.error(`⚠️ No rider for ${orderIdFormatted} — assign manually!`, {
        duration: 10000,
      });
    });

    // ── Rider status change ───────────────────────────────────────
    adminSocket.on('admin:rider_status_changed', ({ name, status }) => {
      console.log(`Rider ${name} is now ${status}`);
    });

    // ── Low stock alert ───────────────────────────────────────────
    adminSocket.on('admin:low_stock', ({ name, stock }) => {
      toast(`📦 Low stock: ${name} — only ${stock} left`, {
        icon: '⚠️', duration: 8000,
        style: { background: '#fff7ed', color: '#c2410c' },
      });
    });

    adminSocket.on('disconnect', (reason) => {
      console.log('Admin socket disconnected:', reason);
    });

    return () => {
      // Keep alive during admin session
    };
  }, [isAuthenticated, accessToken]);

  const disconnectAdminSocket = () => {
    if (adminSocket) {
      adminSocket.disconnect();
      adminSocket = null;
    }
  };

  return { adminSocket, disconnectAdminSocket };
};

export default useAdminSocket;
