import { create }  from 'zustand';
import { persist } from 'zustand/middleware';
import api         from '@/api/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,
      devOtp:          null,

      // ── Send OTP ────────────────────────────────────────────────
      sendOTP: async (phone) => {
        set({ isLoading: true, error: null, devOtp: null });
        try {
          const { data } = await api.post('/auth/send-otp', { phone });

          if (data.devOtp) {
            set({ devOtp: data.devOtp });
            console.info(
              `%c🔐 DEV OTP for ${phone}: ${data.devOtp}`,
              'color: #16a34a; font-size: 18px; font-weight: bold; background: #f0fdf4; padding: 4px 8px; border-radius: 4px;'
            );
          }

          set({ isLoading: false });
          return { success: true, message: data.message, devOtp: data.devOtp || null };
        } catch (err) {
          const error = err.response?.data?.error || 'Failed to send OTP';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      // ── Verify OTP & Login ───────────────────────────────────────
      verifyOTP: async (phone, otp) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/verify-otp', { phone, otp });

          // ✅ FIX: destructure isNewUser from data.data, not from user object
          const { user, accessToken, refreshToken, isNewUser } = data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading:       false,
            error:           null,
            devOtp:          null,
          });

          // ✅ FIX: isNewUser from top-level + fallback: if user has no name yet
          const newUser = isNewUser ?? !user?.name;

          return { success: true, isNewUser: newUser, role: user.role };
        } catch (err) {
          const error = err.response?.data?.error || 'OTP verification failed';
          set({ isLoading: false, error });
          return { success: false, error };
        }
      },

      // ── Logout ───────────────────────────────────────────────────
      logout: async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user:            null,
          accessToken:     null,
          refreshToken:    null,
          isAuthenticated: false,
          error:           null,
          devOtp:          null,
        });
      },

      // ── Update profile ───────────────────────────────────────────
      updateProfile: async (profileData) => {
        try {
          const res = await api.put('/auth/profile', profileData);
          set({ user: res.data.data });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.error };
        }
      },

      // ── Add address ──────────────────────────────────────────────
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

      // ── Delete address ───────────────────────────────────────────
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

      // ── Refresh user data ────────────────────────────────────────
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
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
