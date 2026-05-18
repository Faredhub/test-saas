import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarStyle = "modern" | "classic" | "windows";
export type NavPosition = "left" | "right" | "top" | "bottom";

interface SidebarState {
  /** Currently selected category in the dock */
  activeCategory: string | null;
  /** Whether the sub-panel is pinned open */
  panelPinned: boolean;
  /** Sidebar style: modern (dock+panel) or classic (full sidebar) */
  sidebarStyle: SidebarStyle;
  /** Navigation position for desktop layouts */
  navPosition: NavPosition;
  /** Industry-specific terminology loaded from tenant onboarding settings */
  terminology: Record<string, string>;
  /** Enabled module keys loaded from tenant onboarding settings */
  enabledModules: string[] | null;
  /** Mobile sidebar open state */
  mobileOpen: boolean;

  setActiveCategory: (category: string | null) => void;
  togglePanelPinned: () => void;
  setPanelPinned: (pinned: boolean) => void;
  setSidebarStyle: (style: SidebarStyle) => void;
  setNavPosition: (position: NavPosition) => void;
  setWorkspaceNavigation: (prefs: {
    terminology?: Record<string, string>;
    enabledModules?: string[] | null;
  }) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      activeCategory: null,
      panelPinned: true,
      sidebarStyle: "modern",
      navPosition: "left",
      terminology: {},
      enabledModules: null,
      mobileOpen: false,

      setActiveCategory: (category) =>
        set((state) => ({
          activeCategory: state.activeCategory === category ? null : category,
        })),

      togglePanelPinned: () =>
        set((state) => ({ panelPinned: !state.panelPinned })),

      setPanelPinned: (pinned) => set({ panelPinned: pinned }),

      setSidebarStyle: (sidebarStyle) => set({ sidebarStyle }),

      setNavPosition: (navPosition) => set({ navPosition }),

      setWorkspaceNavigation: ({ terminology, enabledModules }) =>
        set({
          terminology: terminology ?? {},
          enabledModules: enabledModules ?? null,
        }),

      setMobileOpen: (mobileOpen) => set({ mobileOpen }),

      toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
    }),
    {
      name: "tixel-sidebar",
      version: 3,
    }
  )
);
