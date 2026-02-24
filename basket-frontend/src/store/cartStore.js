import { create } from 'zustand';
import api from '@/api/axios';
import toast from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  items: [],
  totalAmount: 0,
  totalItems: 0,
  itemCount: 0,
  isLoading: false,
  lastFetched: null,

  // ── Fetch full cart (with live product prices) ────────────────────
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/cart');
      const { items, totalAmount, totalItems, itemCount } = data.data;
      set({ items, totalAmount, totalItems, itemCount, isLoading: false, lastFetched: Date.now() });
    } catch (_) {
      set({ isLoading: false });
    }
  },

  // ── Get cart count (lightweight — for navbar badge) ───────────────
  fetchCartCount: async () => {
    try {
      const { data } = await api.get('/cart/count');
      set({ itemCount: data.data.count });
    } catch (_) {}
  },

  // ── Add to cart ───────────────────────────────────────────────────
  addToCart: async (productId, quantity = 1, productName = '') => {
    try {
      await api.post('/cart/add', { productId, quantity });
      toast.success(`${productName || 'Item'} added to cart! 🛒`);
      get().fetchCartCount();
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to add item';
      toast.error(error);
      return { success: false, error };
    }
  },

  // ── Update quantity ───────────────────────────────────────────────
  updateQuantity: async (productId, quantity) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    }));
    try {
      await api.put(`/cart/update/${productId}`, { quantity });
      get().fetchCart(); // Refresh totals
      return { success: true };
    } catch (err) {
      get().fetchCart(); // Revert on error
      toast.error(err.response?.data?.error || 'Failed to update');
      return { success: false };
    }
  },

  // ── Remove item ───────────────────────────────────────────────────
  removeFromCart: async (productId) => {
    // Optimistic remove
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
      itemCount: Math.max(0, state.itemCount - 1),
    }));
    try {
      await api.delete(`/cart/remove/${productId}`);
      get().fetchCart();
      toast.success('Item removed');
      return { success: true };
    } catch (err) {
      get().fetchCart();
      return { success: false };
    }
  },

  // ── Clear cart ────────────────────────────────────────────────────
  clearCart: async () => {
    try {
      await api.delete('/cart/clear');
      set({ items: [], totalAmount: 0, totalItems: 0, itemCount: 0 });
      return { success: true };
    } catch (_) {
      return { success: false };
    }
  },

  // ── Check if a product is in cart ────────────────────────────────
  getItemQuantity: (productId) => {
    const item = get().items.find((i) => i.productId === productId);
    return item?.quantity || 0;
  },

  // ── Validate coupon ───────────────────────────────────────────────
  validateCoupon: async (code, orderAmount) => {
    try {
      const { data } = await api.post('/payments/validate-coupon', { code, orderAmount });
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },
}));

export default useCartStore;
