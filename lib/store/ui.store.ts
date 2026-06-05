import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface UiStore {
  toast: ToastState | null;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  toast: null,
  showToast: (message, type = 'info') =>
    set({
      toast: {
        message,
        type,
        visible: true,
      },
    }),
  hideToast: () =>
    set((state) => ({
      toast: state.toast ? { ...state.toast, visible: false } : null,
    })),
}));
