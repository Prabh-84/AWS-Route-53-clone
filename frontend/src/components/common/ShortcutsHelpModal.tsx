"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import Table from "@cloudscape-design/components/table";
import { SHORTCUTS } from "@/lib/shortcuts";

export function ShortcutsHelpModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header="Keyboard shortcuts"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <Button variant="primary" onClick={onDismiss}>
            Close
          </Button>
        </Box>
      }
    >
      <Table
        variant="embedded"
        items={[...SHORTCUTS]}
        trackBy="keys"
        columnDefinitions={[
          {
            id: "keys",
            header: "Key",
            width: 110,
            cell: (shortcut) => (
              <Box variant="code" fontWeight="bold">
                {shortcut.keys}
              </Box>
            ),
          },
          { id: "description", header: "Action", cell: (shortcut) => shortcut.description },
        ]}
      />
      <Box variant="small" color="text-body-secondary" margin={{ top: "s" }}>
        Shortcuts are ignored while you are typing in a field or while a dialog is open.
      </Box>
    </Modal>
  );
}
