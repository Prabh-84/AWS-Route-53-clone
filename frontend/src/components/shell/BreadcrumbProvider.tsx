"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface Crumb {
  text: string;
  href: string;
}

interface BreadcrumbContextValue {
  items: Crumb[];
  setItems: (items: Crumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Crumb[]>([]);
  const value = useMemo(() => ({ items, setItems }), [items]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbItems(): Crumb[] {
  const context = useContext(BreadcrumbContext);
  if (!context) throw new Error("useBreadcrumbItems must be used inside <BreadcrumbProvider>");
  return context.items;
}

/** Pages call this to declare their breadcrumb trail; the last item is the current page. */
export function usePageBreadcrumbs(items: Crumb[]): void {
  const context = useContext(BreadcrumbContext);
  if (!context) throw new Error("usePageBreadcrumbs must be used inside <BreadcrumbProvider>");
  const { setItems } = context;
  const key = JSON.stringify(items); // stable dependency even if the caller passes a new array each render

  useEffect(() => {
    setItems(JSON.parse(key) as Crumb[]);
    return () => setItems([]);
  }, [key, setItems]);
}
