import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/authStore';
import useOrderStore from '@/store/orderStore';
import toast from 'react-hot-toast';

let globalSocket = null; // Singleton — prevent multiple connections

const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { updateTrackedOrderStatus, updateRiderLocation } = useOrderStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Reuse existing socket if already connected with same token
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // ── Order status updates ───────────────────────────────────────
    socket.on('order:status_updated', ({ status, message }) => {
      updateTrackedOrderStatus(status);
      if (message) {
        const icons = {
          packing: '📦',
          out_for_delivery: '🏍️',
          delivered: '✅',
          cancelled: '❌',
        };
        toast(message, { icon: icons[status] || '🛒', duration: 5000 });
      }
    });

    // ── Rider GPS location ─────────────────────────────────────────
    socket.on('order:rider_location', ({ lat, lng }) => {
      updateRiderLocation(lat, lng);
    });

    globalSocket = socket;
    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — keep alive for whole session
    };
  }, [isAuthenticated, accessToken]);

  // ── Join a specific order tracking room ───────────────────────────
  const joinOrderRoom = useCallback((orderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:order_room', { orderId });
    }
  }, []);

  // ── Leave order tracking room ─────────────────────────────────────
  const leaveOrderRoom = useCallback((orderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:order_room', { orderId });
    }
  }, []);

  // ── Disconnect on logout ──────────────────────────────────────────
  const disconnectSocket = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
  }, []);

  return {
    socket: socketRef.current,
    joinOrderRoom,
    leaveOrderRoom,
    disconnectSocket,
    isConnected: socketRef.current?.connected || false,
  };
};

export default useSocket;
