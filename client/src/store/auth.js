import { create } from 'zustand';
import { api } from '../utils/api.js';

export const useAuth = create((set, get) => ({
  user: null,
  status: 'loading', // 'loading' | 'unauth' | 'setup-required' | 'authed'
  error: null,

  bootstrap: async () => {
    try {
      const { setupRequired } = await api.get('/auth/status');
      if (setupRequired) {
        set({ status: 'setup-required', user: null });
        return;
      }
    } catch {
      set({ status: 'unauth', user: null });
      return;
    }
    try {
      const user = await api.get('/auth/me');
      set({ status: 'authed', user });
    } catch {
      set({ status: 'unauth', user: null });
    }
  },

  login: async (email, password, second = {}) => {
    set({ error: null });
    try {
      const { user } = await api.post('/auth/login', { email, password, ...second });
      set({ status: 'authed', user, error: null });
      return user;
    } catch (e) {
      // Surface the requires2fa flag so the Login page can show the 2nd-step prompt
      e.requires2fa = (e.body && e.body.requires2fa) || /2fa/i.test(e.message || '');
      set({ error: e.message });
      throw e;
    }
  },

  setup: async (payload) => {
    set({ error: null });
    const { user } = await api.post('/auth/setup', payload);
    set({ status: 'authed', user, error: null });
    return user;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    set({ status: 'unauth', user: null });
  },

  expire: () => {
    if (get().status === 'authed') set({ status: 'unauth', user: null });
  },
}));
