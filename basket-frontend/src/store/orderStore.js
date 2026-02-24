import { create } from 'zustand';
import api from '@/api/axios';

const useOrderStore = create((set, get) => ({
  orders: [],
  activeOrder: null,
  trackedOrder: null,
  isLoading: false,
  pagination: null,

  // ── Place order ───────────────────────────────────────────────────
  placeOrder: async (orderData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/orders', orderData);
      set({ isLoading: false });
      return { success: true, data: data.data };
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to place order',
        details: err.response?.data?.details,
      };
    }
  },

  // ── Get order history ─────────────────────────────────────────────
  fetchOrders: async (page = 1, status = '') => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (status) params.append('status', status);

      const { data } = await api.get(`/orders?${params}`);
      set({
        orders: data.data,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (_) {
      set({ isLoading: false });
    }
  },

  // ── Track order by BSKxxx orderId ─────────────────────────────────
  trackOrder: async (orderId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/orders/track/${orderId}`);
      set({ trackedOrder: data.data, isLoading: false });
      return { success: true, data: data.data };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Get single order by MongoDB _id ──────────────────────────────
  fetchOrder: async (id) => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Cancel order ──────────────────────────────────────────────────
  cancelOrder: async (id, reason) => {
    try {
      const { data } = await api.put(`/orders/${id}/cancel`, { reason });
      // Update in local list
      set((state) => ({
        orders: state.orders.map((o) =>
          o._id === id ? { ...o, status: 'cancelled' } : o
        ),
      }));
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Rate order ────────────────────────────────────────────────────
  rateOrder: async (id, rating, review) => {
    try {
      await api.post(`/orders/${id}/rate`, { rating, review });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Update tracked order status via socket ────────────────────────
  updateTrackedOrderStatus: (status, extra = {}) => {
    set((state) => ({
      trackedOrder: state.trackedOrder
        ? { ...state.trackedOrder, status, ...extra }
        : null,
    }));
  },

  // ── Update rider location in tracked order ────────────────────────
  updateRiderLocation: (lat, lng) => {
    set((state) => ({
      trackedOrder: state.trackedOrder
        ? {
            ...state.trackedOrder,
            rider: {
              ...state.trackedOrder.rider,
              currentLocation: { type: 'Point', coordinates: [lng, lat] },
            },
          }
        : null,
    }));
  },

  clearTrackedOrder: () => set({ trackedOrder: null }),
}));

export default useOrderStore;
