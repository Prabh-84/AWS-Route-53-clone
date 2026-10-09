"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ShortcutsHelpModal } from "@/components/common/ShortcutsHelpModal";

interface ShortcutsContextValue {
  openHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

/** Owns the "?" help dialog so any page's shortcuts can open it. */
export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const value = useMemo(() => ({ openHelp: () => setHelpOpen(true) }), []);
  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      {helpOpen && <ShortcutsHelpModal visible onDismiss={() => setHelpOpen(false)} />}
    </ShortcutsContext.Provider>
  );
}

export function useShortcutsHelp(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) throw new Error("useShortcutsHelp must be used inside <ShortcutsProvider>");
  return context;
}
