import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Uniwind } from 'uniwind';
import { zustandSecureStorage } from '@/lib/secure-store';

export type Theme = 'light' | 'dark' | 'system';

type PreferencesStore = {
  hasSeenOnboarding: boolean;
  hasSeenNotificationPrimer: boolean;
  theme: Theme;
  language: string;
  _hasHydrated: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
  setHasSeenNotificationPrimer: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasSeenNotificationPrimer: false,
      theme: 'system',
      language: 'en',
      _hasHydrated: false,
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
      setHasSeenNotificationPrimer: (value) => set({ hasSeenNotificationPrimer: value }),
      setTheme: (theme) => {
        Uniwind.setTheme(theme);
        set({ theme });
      },
      setLanguage: (language) => set({ language }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => zustandSecureStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasSeenNotificationPrimer: state.hasSeenNotificationPrimer,
        theme: state.theme,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.theme) {
          Uniwind.setTheme(state.theme);
        }
      },
    }
  )
);
