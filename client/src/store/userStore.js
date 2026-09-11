import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUserStore = create(
  persist(
    (set) => ({
      globalName: "",
      globalAvatarSeed: "",

      setGlobalName: (name) => set({ globalName: name }),
      
      setGlobalAvatarSeed: (seed) => set({ globalAvatarSeed: seed }),

      initializeAvatar: () =>
        set((state) => {
          if (!state.globalAvatarSeed) {
            const newSeed = Math.random().toString(36).substring(7);
            return { globalAvatarSeed: newSeed };
          }
          return state;
        }),
    }),
    {
      name: "user-preferences", 
    }
  )
);

export default useUserStore;
