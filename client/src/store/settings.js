import { create } from 'zustand';
import { api } from '../utils/api.js';

export const useSettings = create((set) => ({
  settings: {},
  loaded: false,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/settings');
      set({ settings: data, loaded: true, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },
  update: async (patch) => {
    const data = await api.put('/settings', patch);
    set({ settings: data });
    return data;
  },
}));
