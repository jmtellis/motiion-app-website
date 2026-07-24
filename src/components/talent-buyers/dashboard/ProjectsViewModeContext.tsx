"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SegmentedControl } from "./SegmentedControl";

export type ProjectsViewMode = "browse" | "focus";

const VIEW_MODE_KEY = "projects-view-mode";

const VIEW_OPTIONS: { value: ProjectsViewMode; label: string }[] = [
  { value: "browse", label: "Browse" },
  { value: "focus", label: "Focus" },
];

function normalizeViewMode(value: string | null): ProjectsViewMode | null {
  if (value === "browse" || value === "grid") return "browse";
  if (value === "focus" || value === "carousel") return "focus";
  return null;
}

type ProjectsViewModeContextValue = {
  viewMode: ProjectsViewMode;
  setViewMode: (mode: ProjectsViewMode) => void;
};

const ProjectsViewModeContext = createContext<ProjectsViewModeContextValue | null>(null);

export function ProjectsViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ProjectsViewMode>("browse");

  useEffect(() => {
    const stored = normalizeViewMode(window.localStorage.getItem(VIEW_MODE_KEY));
    if (stored) {
      setViewModeState(stored);
      window.localStorage.setItem(VIEW_MODE_KEY, stored);
    }
  }, []);

  const setViewMode = useCallback((mode: ProjectsViewMode) => {
    setViewModeState(mode);
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
    }),
    [viewMode, setViewMode],
  );

  return <ProjectsViewModeContext.Provider value={value}>{children}</ProjectsViewModeContext.Provider>;
}

export function useProjectsViewMode() {
  const context = useContext(ProjectsViewModeContext);
  if (!context) {
    throw new Error("useProjectsViewMode must be used within ProjectsViewModeProvider");
  }
  return context;
}

export function ProjectsHubViewToggle() {
  const { viewMode, setViewMode } = useProjectsViewMode();

  return (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={viewMode}
      onChange={setViewMode}
      ariaLabel="Projects view"
      equalWidth
      activeTone="white"
    />
  );
}
