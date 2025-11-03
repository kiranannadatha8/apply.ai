import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WorkspaceState {
  activeWorkspaceId?: string | null;
  role?: "ADMIN" | "MEMBER" | "VIEWER" | null;
  setWorkspace: (id: string | null, role?: WorkspaceState["role"]) => void;
}

export const useWorkspace = create(
  persist<WorkspaceState>(
    (set) => ({
      activeWorkspaceId: null,
      role: null,
      setWorkspace: (id, role) => set({ activeWorkspaceId: id, role: role ?? null }),
    }),
    {
      name: "applyai-workspace",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
