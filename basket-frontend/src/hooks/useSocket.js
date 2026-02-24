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

    // Reuse existing socket if already connected
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
          packing:          '📦',
          out_for_delivery: '🏍️',
          delivered:        '✅',
          cancelled:        '❌',
        };
        toast(message, { icon: icons[status] || '🛒', duration: 5000 });
      }
    });

    // ── Phase 9: Rider live GPS location ──────────────────────────
    // Backend emitRiderLocation sends { lat, lng }
    socket.on('order:rider_location', ({ lat, lng }) => {
      updateRiderLocation(lat, lng);
    });

    // ── Phase 9: Delivery OTP received ────────────────────────────
    socket.on('order:delivery_otp', ({ otp, orderId }) => {
      toast(`🔑 Your delivery OTP: ${otp}`, {
        duration: 60000,
        id: `otp-${orderId}`,
        style: {
          fontFamily:    'monospace',
          fontSize:      '22px',
          fontWeight:    'bold',
          letterSpacing: '6px',
          background:    '#f0fdf4',
          color:         '#166534',
          border:        '1px solid #bbf7d0',
        },
      });
    });

    globalSocket = socket;
    socketRef.current = socket;

    return () => {
      // Keep socket alive for the entire session
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
    socket:         socketRef.current,
    joinOrderRoom,
    leaveOrderRoom,
    disconnectSocket,
    isConnected:    socketRef.current?.connected || false,
  };
};

export default useSocket;
