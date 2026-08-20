import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BirthdayStore {
  /** Birthday mode skins the app (banners, tiles, ambient touches) while on. */
  birthdayMode: boolean;
  /** Monotonic counter; each bump fires one celebration (confetti + sound + haptics). */
  celebrationId: number;
  setBirthdayMode: (on: boolean) => void;
  celebrate: () => void;
}

export const useBirthdayStore = create<BirthdayStore>()(
  persist(
    (set) => ({
      birthdayMode: false,
      celebrationId: 0,

      setBirthdayMode: (on) => set({ birthdayMode: on }),

      celebrate: () => set((state) => ({ celebrationId: state.celebrationId + 1 })),
    }),
    {
      name: 'noon-birthday',
      partialize: (state) => ({ birthdayMode: state.birthdayMode }),
    }
  )
);
