import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarStyle = "modern" | "classic";

interface SidebarState {
  /** Currently selected category in the dock */
  activeCategory: string | null;
  /** Whether the sub-panel is pinned open */
  panelPinned: boolean;
  /** Sidebar style: modern (dock+panel) or classic (full sidebar) */
  sidebarStyle: SidebarStyle;
  /** Mobile sidebar open state */
  mobileOpen: boolean;

  setActiveCategory: (category: string | null) => void;
  togglePanelPinned: () => void;
  setPanelPinned: (pinned: boolean) => void;
  setSidebarStyle: (style: SidebarStyle) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      activeCategory: null,
      panelPinned: true,
      sidebarStyle: "modern",
      mobileOpen: false,

      setActiveCategory: (category) =>
        set((state) => ({
          activeCategory: state.activeCategory === category ? null : category,
        })),

      togglePanelPinned: () =>
        set((state) => ({ panelPinned: !state.panelPinned })),

      setPanelPinned: (pinned) => set({ panelPinned: pinned }),

      setSidebarStyle: (sidebarStyle) => set({ sidebarStyle }),

      setMobileOpen: (mobileOpen) => set({ mobileOpen }),

      toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
    }),
    {
      name: "tixel-sidebar",
      version: 2,
    }
  )
);
