/** Single source for the help dialog and the key handling below. */
export const SHORTCUTS = [
  { keys: "/", description: "Focus the search / filter box" },
  { keys: "c", description: "Create (hosted zone, or record when viewing a zone)" },
  { keys: "e", description: "Edit the selected item (when exactly one is selected)" },
  { keys: "Delete", description: "Delete the selected items" },
  { keys: "r", description: "Refresh the current list" },
  { keys: "?", description: "Show this list of keyboard shortcuts" },
] as const;
