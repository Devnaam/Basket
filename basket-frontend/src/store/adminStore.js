import { create } from 'zustand';
import api from '@/api/axios';

const useAdminStore = create((set, get) => ({
  // ── Dashboard ─────────────────────────────────────────────────────
  metrics: null,
  liveOrders: [],       // Real-time order feed (last 20)
  isLoadingMetrics: false,

  fetchMetrics: async () => {
    set({ isLoadingMetrics: true });
    try {
      const { data } = await api.get('/admin/dashboard');
      set({ metrics: data.data, isLoadingMetrics: false });
    } catch (_) {
      set({ isLoadingMetrics: false });
    }
  },

  // Called by socket when new order arrives
  pushLiveOrder: (order) => {
    set((state) => ({
      liveOrders: [order, ...state.liveOrders].slice(0, 20),
    }));
  },

  // Called by socket when order is updated
  updateLiveOrder: (orderId, updates) => {
    set((state) => ({
      liveOrders: state.liveOrders.map((o) =>
        o.orderId === orderId ? { ...o, ...updates } : o
      ),
    }));
  },

  // ── Orders ────────────────────────────────────────────────────────
  orders: [],
  ordersPagination: null,
  isLoadingOrders: false,

  fetchOrders: async (params = {}) => {
    set({ isLoadingOrders: true });
    try {
      const query = new URLSearchParams({ page: 1, limit: 20, ...params });
      const { data } = await api.get(`/admin/orders?${query}`);
      set({ orders: data.data, ordersPagination: data.pagination, isLoadingOrders: false });
    } catch (_) {
      set({ isLoadingOrders: false });
    }
  },

  assignRider: async (orderId, riderId) => {
    try {
      const { data } = await api.put(`/admin/orders/${orderId}/assign-rider`, { riderId });
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  cancelOrder: async (orderId, reason) => {
    try {
      await api.put(`/admin/orders/${orderId}/cancel`, { reason });
      set((state) => ({
        orders: state.orders.map((o) =>
          o._id === orderId ? { ...o, status: 'cancelled' } : o
        ),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Riders ────────────────────────────────────────────────────────
  riders: [],
  ridersPagination: null,
  isLoadingRiders: false,

  fetchRiders: async (params = {}) => {
    set({ isLoadingRiders: true });
    try {
      const query = new URLSearchParams({ page: 1, limit: 20, ...params });
      const { data } = await api.get(`/admin/riders?${query}`);
      set({ riders: data.data, ridersPagination: data.pagination, isLoadingRiders: false });
    } catch (_) {
      set({ isLoadingRiders: false });
    }
  },

  onboardRider: async (riderData) => {
    try {
      const { data } = await api.post('/admin/riders', riderData);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  toggleRider: async (riderId) => {
    try {
      const { data } = await api.patch(`/admin/riders/${riderId}/toggle`);
      set((state) => ({
        riders: state.riders.map((r) =>
          r._id === riderId ? { ...r, isActive: !r.isActive } : r
        ),
      }));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  fetchRiderPerformance: async (riderId) => {
    try {
      const { data } = await api.get(`/admin/riders/${riderId}/performance`);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Products ──────────────────────────────────────────────────────
  products: [],
  productsPagination: null,
  isLoadingProducts: false,

  fetchProducts: async (params = {}) => {
    set({ isLoadingProducts: true });
    try {
      const query = new URLSearchParams({ page: 1, limit: 20, ...params });
      const { data } = await api.get(`/products?${query}`);
      set({ products: data.data, productsPagination: data.pagination, isLoadingProducts: false });
    } catch (_) {
      set({ isLoadingProducts: false });
    }
  },

  createProduct: async (productData) => {
    try {
      const { data } = await api.post('/products', productData);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const { data } = await api.put(`/products/${id}`, productData);
      set((state) => ({
        products: state.products.map((p) => (p._id === id ? data.data : p)),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  toggleProduct: async (id) => {
    try {
      const { data } = await api.patch(`/products/${id}/toggle`);
      set((state) => ({
        products: state.products.map((p) =>
          p._id === id ? { ...p, isActive: !p.isActive } : p
        ),
      }));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Coupons ───────────────────────────────────────────────────────
  coupons: [],
  isLoadingCoupons: false,

  fetchCoupons: async () => {
    set({ isLoadingCoupons: true });
    try {
      const { data } = await api.get('/admin/coupons?limit=50');
      set({ coupons: data.data, isLoadingCoupons: false });
    } catch (_) {
      set({ isLoadingCoupons: false });
    }
  },

  createCoupon: async (couponData) => {
    try {
      const { data } = await api.post('/admin/coupons', couponData);
      set((state) => ({ coupons: [data.data, ...state.coupons] }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  updateCoupon: async (id, updates) => {
    try {
      const { data } = await api.put(`/admin/coupons/${id}`, updates);
      set((state) => ({
        coupons: state.coupons.map((c) => (c._id === id ? data.data : c)),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  deleteCoupon: async (id) => {
    try {
      await api.delete(`/admin/coupons/${id}`);
      set((state) => ({
        coupons: state.coupons.map((c) =>
          c._id === id ? { ...c, isActive: false } : c
        ),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Users ─────────────────────────────────────────────────────────
  users: [],
  usersPagination: null,
  isLoadingUsers: false,

  fetchUsers: async (params = {}) => {
    set({ isLoadingUsers: true });
    try {
      const query = new URLSearchParams({ page: 1, limit: 20, ...params });
      const { data } = await api.get(`/admin/users?${query}`);
      set({ users: data.data, usersPagination: data.pagination, isLoadingUsers: false });
    } catch (_) {
      set({ isLoadingUsers: false });
    }
  },

  toggleUser: async (userId) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/toggle`);
      set((state) => ({
        users: state.users.map((u) =>
          u._id === userId ? { ...u, isActive: !u.isActive } : u
        ),
      }));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  // ── Analytics ─────────────────────────────────────────────────────
  analytics: null,
  isLoadingAnalytics: false,

  fetchAnalytics: async (period = '7d') => {
    set({ isLoadingAnalytics: true });
    try {
      const { data } = await api.get(`/admin/analytics?period=${period}`);
      set({ analytics: data.data, isLoadingAnalytics: false });
    } catch (_) {
      set({ isLoadingAnalytics: false });
    }
  },
}));

export default useAdminStore;
