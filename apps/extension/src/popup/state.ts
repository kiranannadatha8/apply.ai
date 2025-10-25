import { create } from "zustand";

interface PopupState {
  screen: "welcome" | "connect" | "connected" | "expired";
  setScreen: (s: PopupState["screen"]) => void;
  email?: string;
}
export const usePopup = create<PopupState>((set) => ({
  screen: "welcome",
  setScreen: (s) => set({ screen: s }),
}));
