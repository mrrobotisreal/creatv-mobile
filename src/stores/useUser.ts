import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { User } from "../types/user";

interface UserStore {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (value: boolean) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setUser: (nextUser) => {
        if (!nextUser) {
          set({ user: null });
          return;
        }
        const existingToken = get().user?.token ?? null;
        const mergedUser: User = {
          ...nextUser,
          token: nextUser.token ?? existingToken ?? null,
        };
        set({ user: mergedUser });
      },
    }),
    {
      name: "creatv:user",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

