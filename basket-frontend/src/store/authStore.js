import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/api/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Send OTP ──────────────────────────────────────────────────
      sendOTP: async (phone) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/send-otp', { phone });
          set({ isLoading: false });
          return { success: true, message: data.message };
        } catch (err) {
          const error = err.response?.data?.error || 'Failed to send OTP';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      // ── Verify OTP & Login ────────────────────────────────────────
      verifyOTP: async (phone, otp) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/verify-otp', { phone, otp });
          const { user, accessToken, refreshToken } = data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true, isNewUser: user.isNewUser };
        } catch (err) {
          const error = err.response?.data?.error || 'OTP verification failed';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      // ── Logout ────────────────────────────────────────────────────
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (_) {
          // Silent — logout even if API call fails
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // ── Update profile ────────────────────────────────────────────
      updateProfile: async (data) => {
        try {
          const res = await api.put('/auth/profile', data);
          set({ user: res.data.data });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.error };
        }
      },

      // ── Add address ───────────────────────────────────────────────
      addAddress: async (addressData) => {
        try {
          const res = await api.post('/auth/address', addressData);
          set((state) => ({
            user: { ...state.user, addresses: res.data.data },
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.error };
        }
      },

      // ── Delete address ────────────────────────────────────────────
      deleteAddress: async (addressId) => {
        try {
          const res = await api.delete(`/auth/address/${addressId}`);
          set((state) => ({
            user: { ...state.user, addresses: res.data.data },
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.error };
        }
      },

      // ── Refresh user data ─────────────────────────────────────────
      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data });
        } catch (_) {}
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'basket-auth',
      // Only persist essential fields — not loading/error states
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
