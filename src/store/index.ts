import { create } from 'zustand';

interface AppState {
  isDbReady: boolean;
  setDbReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDbReady: false,
  setDbReady: (ready) => set({ isDbReady: ready }),
}));
