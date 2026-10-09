"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";

export interface NotifyOptions {
  type: "success" | "error" | "info" | "warning";
  content: React.ReactNode;
  header?: React.ReactNode;
  /** Adds a loading spinner icon instead of the status icon. */
  loading?: boolean;
}

interface NotificationContextValue {
  items: FlashbarProps.MessageDefinition[];
  /** Push a flash message; returns its id. */
  notify: (options: NotifyOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const notify = useCallback(
    (options: NotifyOptions) => {
      const id = `flash-${++counter.current}`;
      const item: FlashbarProps.MessageDefinition = {
        id,
        type: options.type,
        header: options.header,
        content: options.content,
        loading: options.loading,
        dismissible: true,
        dismissLabel: "Dismiss message",
        onDismiss: () => dismiss(id),
      };
      setItems((current) => [item, ...current]);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ items, notify, dismiss, clear }), [items, notify, dismiss, clear]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return context;
}
