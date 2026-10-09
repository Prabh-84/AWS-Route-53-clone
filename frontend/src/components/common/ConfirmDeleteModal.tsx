"use client";

import { useState } from "react";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";

interface ConfirmDeleteModalProps {
  visible: boolean;
  /** e.g. "hosted zone" — pluralised with an "s" when more than one name is listed. */
  resourceLabel: string;
  names: string[];
  /** The word the user must type before the confirm button is enabled. */
  confirmWord?: string;
  loading?: boolean;
  /** Failure message from the last attempt; shown in the dialog, which stays open. */
  error?: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** Remounts the dialog each time it opens, so the typed confirmation never carries over. */
export function ConfirmDeleteModal(props: ConfirmDeleteModalProps) {
  return <ConfirmDeleteDialog key={String(props.visible)} {...props} />;
}

function ConfirmDeleteDialog({
  visible,
  resourceLabel,
  names,
  confirmWord = "delete",
  loading,
  error,
  onConfirm,
  onDismiss,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState("");

  const plural = names.length > 1;
  const label = plural ? `${resourceLabel}s` : resourceLabel;
  const confirmed = typed.trim().toLowerCase() === confirmWord;

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={`Delete ${label}`}
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={!confirmed} loading={loading}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && (
          <Alert type="error" header={`Failed to delete ${label}`}>
            {error}
          </Alert>
        )}
        <Box>
          {plural ? `Are you sure you want to delete these ${names.length} ${label}?` : `Are you sure you want to delete the ${label}?`}
        </Box>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {names.map((name) => (
            <li key={name}>
              <Box variant="strong">{name}</Box>
            </li>
          ))}
        </ul>
        <FormField label={<>To confirm deletion, type <em>{confirmWord}</em> in the text input field.</>}>
          <Input
            value={typed}
            onChange={({ detail }) => setTyped(detail.value)}
            placeholder={confirmWord}
            ariaLabel={`Type ${confirmWord} to confirm`}
            onKeyDown={({ detail }) => {
              if (detail.key === "Enter" && confirmed && !loading) onConfirm();
            }}
            autoFocus
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
