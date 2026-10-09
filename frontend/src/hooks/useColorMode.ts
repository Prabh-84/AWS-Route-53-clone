"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Mode, applyMode } from "@cloudscape-design/global-styles";

export type ColorMode = "light" | "dark";

/** Also read by the inline script in the root layout, which applies the class before first paint. */
export const COLOR_MODE_KEY = "r53-color-mode";
const CHANGE_EVENT = "r53-color-mode-change";

function read(): ColorMode {
  try {
    return localStorage.getItem(COLOR_MODE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light"; // storage blocked: fall back to light
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // keep other tabs in sync
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Current mode (persisted in localStorage) plus a toggle. Server render and first client render say "light". */
export function useColorMode() {
  const mode = useSyncExternalStore(subscribe, read, () => "light" as ColorMode);

  const setMode = useCallback((next: ColorMode) => {
    try {
      localStorage.setItem(COLOR_MODE_KEY, next);
    } catch {
      // ignore: the choice just won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggle = useCallback(() => setMode(read() === "dark" ? "light" : "dark"), [setMode]);
  return { mode, setMode, toggle };
}

/** Mount once: keeps Cloudscape's mode class on <body> in sync with the stored choice. */
export function useApplyColorMode() {
  const { mode } = useColorMode();
  useEffect(() => {
    applyMode(mode === "dark" ? Mode.Dark : Mode.Light);
  }, [mode]);
}
