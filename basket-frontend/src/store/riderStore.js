import { create } from 'zustand';
import api from '@/api/axios';

const useRiderStore = create((set, get) => ({
  // ── Profile & Status ──────────────────────────────────────────────
  profile: null,
  isLoadingProfile: false,

  fetchProfile: async () => {
    set({ isLoadingProfile: true });
    try {
      const { data } = await api.get('/riders/me/profile');
      set({ profile: data.data, isLoadingProfile: false });
      return { success: true };
    } catch (err) {
      set({ isLoadingProfile: false });
      return { success: false, error: err.response?.data?.error };
    }
  },

  toggleStatus: async (newStatus) => {
    try {
      const { data } = await api.patch('/riders/me/status', { status: newStatus });
      set((state) => ({
        profile: state.profile ? { ...state.profile, status: newStatus } : state.profile,
      }));
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  updateLocation: async (coords) => {
    try {
      await api.put('/riders/me/location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (_) {}
  },

  // ── Active Order ──────────────────────────────────────────────────
  activeOrder: null,
  isLoadingActiveOrder: false,
  pendingAssignment: null,   // Order awaiting accept/reject decision

  fetchActiveOrder: async () => {
    set({ isLoadingActiveOrder: true });
    try {
      const { data } = await api.get('/riders/me/active-order');
      set({ activeOrder: data.data || null, isLoadingActiveOrder: false });
    } catch (_) {
      set({ activeOrder: null, isLoadingActiveOrder: false });
    }
  },

  setPendingAssignment: (order) => set({ pendingAssignment: order }),
  clearPendingAssignment: () => set({ pendingAssignment: null }),

  updateOrderStatus: async (orderId, status, extras = {}) => {
    try {
      const { data } = await api.put(`/riders/orders/${orderId}/status`, { status, ...extras });
      set({ activeOrder: data.data });
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  verifyDeliveryOTP: async (orderId, otp) => {
    try {
      const { data } = await api.put(`/riders/orders/${orderId}/verify-delivery`, { otp });
      set({ activeOrder: null });    // Clear active order on successful delivery
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  clearActiveOrder: () => set({ activeOrder: null }),

  // ── Delivery History ──────────────────────────────────────────────
  deliveries: [],
  deliveriesPagination: null,
  isLoadingDeliveries: false,

  fetchDeliveries: async (page = 1) => {
    set({ isLoadingDeliveries: true });
    try {
      const { data } = await api.get(`/riders/me/deliveries?page=${page}&limit=15`);
      set((state) => ({
        deliveries: page === 1 ? data.data : [...state.deliveries, ...data.data],
        deliveriesPagination: data.pagination,
        isLoadingDeliveries: false,
      }));
    } catch (_) {
      set({ isLoadingDeliveries: false });
    }
  },

  // ── Earnings ──────────────────────────────────────────────────────
  earnings: null,
  isLoadingEarnings: false,

  fetchEarnings: async (period = '7d') => {
    set({ isLoadingEarnings: true });
    try {
      const { data } = await api.get(`/riders/me/earnings?period=${period}`);
      set({ earnings: data.data, isLoadingEarnings: false });
    } catch (_) {
      set({ isLoadingEarnings: false });
    }
  },
}));

export default useRiderStore;
