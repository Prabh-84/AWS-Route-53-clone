"use client";

import { useEffect, useRef } from "react";
import { useShortcutsHelp } from "@/components/shell/ShortcutsProvider";

export interface ShortcutHandlers {
  /** "c": go to the relevant create page. */
  onCreate?: () => void;
  /** "e": edit; the handler decides whether exactly one row is selected. */
  onEdit?: () => void;
  /** "Delete": delete the selection; the handler decides whether anything is selected. */
  onDelete?: () => void;
  /** "r": refetch the page's main query. */
  onRefresh?: () => void;
}

// Inputs that don't take typed text. After ticking a table row's checkbox, focus stays on it, and
// shortcuts like "e" and "Delete" must still work.
const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type);
}

/** A dialog (delete confirmation, import, help...) is open: don't trigger page shortcuts behind it. */
function isDialogOpen(): boolean {
  return [...document.querySelectorAll('[role="dialog"]')].some((el) => el.getClientRects().length > 0);
}

export function focusSearchInput(): boolean {
  const input = document.querySelector<HTMLInputElement>("[data-shortcut-search] input");
  input?.focus();
  return !!input;
}

/**
 * Page-level keyboard shortcuts. Ignored while typing in an input/textarea/select, while a dialog
 * is open, and when Ctrl/Cmd/Alt is held.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const { openHelp } = useShortcutsHelp();
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target) || isDialogOpen()) return;

      const { onCreate, onEdit, onDelete, onRefresh } = latest.current;
      let handled = true;
      switch (event.key) {
        case "/":
          handled = focusSearchInput();
          break;
        case "c":
          if (onCreate) onCreate();
          else handled = false;
          break;
        case "e":
          if (onEdit) onEdit();
          else handled = false;
          break;
        case "Delete":
          if (onDelete) onDelete();
          else handled = false;
          break;
        case "r":
          if (onRefresh) onRefresh();
          else handled = false;
          break;
        case "?":
          openHelp();
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault(); // e.g. stop "/" from being typed into the box it just focused
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openHelp]);
}
