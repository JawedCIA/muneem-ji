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

// Treat anything other than the literal '0' or false as enabled.
// This keeps existing installs and missing-key setups GST-on by default.
export function gstIsEnabled(settings) {
  const v = settings?.gstEnabled;
  if (v === undefined || v === null || v === '') return true;
  return String(v) !== '0' && v !== false;
}

export function useGstEnabled() {
  const settings = useSettings((s) => s.settings);
  return gstIsEnabled(settings);
}
