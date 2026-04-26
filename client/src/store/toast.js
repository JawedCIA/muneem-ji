import { create } from 'zustand';

let nextId = 1;

export const useToast = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    const t = { id, type: 'info', duration: 3000, ...toast };
    set({ toasts: [...get().toasts, t] });
    if (t.duration) {
      setTimeout(() => {
        set({ toasts: get().toasts.filter((x) => x.id !== id) });
      }, t.duration);
    }
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (msg) => useToast.getState().push({ type: 'success', message: msg }),
  error: (msg) => useToast.getState().push({ type: 'error', message: msg, duration: 4500 }),
  info: (msg) => useToast.getState().push({ type: 'info', message: msg }),
  warning: (msg) => useToast.getState().push({ type: 'warning', message: msg }),
};
