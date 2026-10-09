"use client";

import { useState } from "react";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FileUpload from "@cloudscape-design/components/file-upload";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { useImportZoneFile } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import type { ImportPreview } from "@/lib/types";

const MAX_BYTES = 1_000_000;

interface ImportZoneFileModalProps {
  visible: boolean;
  zoneId: string;
  onDismiss: () => void;
}

/** Remounts each time it opens so text, preview and errors never carry over. */
export function ImportZoneFileModal(props: ImportZoneFileModalProps) {
  return <ImportDialog key={String(props.visible)} {...props} />;
}

function ImportDialog({ visible, zoneId, onDismiss }: ImportZoneFileModalProps) {
  const { notify } = useNotifications();
  const importZone = useImportZoneFile(zoneId);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = importZone.isPending;

  const readFile = async (selected: File[]) => {
    setFiles(selected);
    setFileError(null);
    const file = selected[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError("The file is too large (limit 1 MB).");
      return;
    }
    setText(await file.text());
  };

  const runPreview = async () => {
    setError(null);
    try {
      const result = await importZone.mutateAsync({ text, dryRun: true });
      if (result.dry_run) setPreview(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  };

  const runImport = async () => {
    setError(null);
    try {
      const result = await importZone.mutateAsync({ text, dryRun: false });
      if (result.dry_run) return;
      const skipped = result.skipped.length;
      notify({
        type: "success",
        content:
          `Successfully imported ${result.created.length} record${result.created.length === 1 ? "" : "s"}.` +
          (skipped > 0 ? ` ${skipped} skipped.` : ""),
      });
      onDismiss();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  };

  const toCreate = preview?.would_create.length ?? 0;

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      size="large"
      header="Import zone file"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={busy}>
              Cancel
            </Button>
            {preview ? (
              <>
                <Button onClick={() => setPreview(null)} disabled={busy}>
                  Back
                </Button>
                <Button variant="primary" onClick={runImport} loading={busy} disabled={toCreate === 0}>
                  {`Import ${toCreate} record${toCreate === 1 ? "" : "s"}`}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={runPreview} loading={busy} disabled={!text.trim() || !!fileError}>
                Preview
              </Button>
            )}
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && (
          <Alert type="error" header="Import failed" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {preview ? (
          <PreviewTables preview={preview} />
        ) : (
          <>
            <FormField
              label="Zone file"
              description="Paste a BIND zone file (or a JSON export of a hosted zone), or upload one. Records that can't be imported are skipped and listed in the preview."
              stretch
            >
              <Textarea
                value={text}
                onChange={({ detail }) => setText(detail.value)}
                placeholder={"$ORIGIN example.com.\n$TTL 300\nwww IN A 192.0.2.1"}
                rows={12}
                spellcheck={false}
                ariaLabel="Zone file"
              />
            </FormField>
            <FormField label="Or upload a file" errorText={fileError}>
              <FileUpload
                value={files}
                onChange={({ detail }) => void readFile(detail.value)}
                accept=".zone,.txt,.json,.db,text/plain,application/json"
                showFileSize
                constraintText="Text or JSON, up to 1 MB."
                i18nStrings={{
                  uploadButtonText: (multiple) => (multiple ? "Choose files" : "Choose file"),
                  dropzoneText: (multiple) => (multiple ? "Drop files to upload" : "Drop file to upload"),
                  removeFileAriaLabel: () => "Remove file",
                  limitShowFewer: "Show fewer files",
                  limitShowMore: "Show more files",
                  errorIconAriaLabel: "Error",
                }}
              />
            </FormField>
          </>
        )}
      </SpaceBetween>
    </Modal>
  );
}

function PreviewTables({ preview }: { preview: ImportPreview }) {
  return (
    <SpaceBetween size="l">
      <Table
        variant="embedded"
        header={<Header variant="h3" counter={`(${preview.would_create.length})`}>Records to create</Header>}
        items={preview.would_create}
        trackBy={(r) => `${r.name}|${r.type}`}
        columnDefinitions={[
          { id: "name", header: "Record name", cell: (r) => stripTrailingDot(r.name) },
          { id: "type", header: "Type", cell: (r) => r.type },
          { id: "ttl", header: "TTL", cell: (r) => r.ttl ?? "-" },
          { id: "values", header: "Value", cell: (r) => r.values.map((v) => <div key={v}>{v}</div>) },
        ]}
        empty={<Box color="inherit">Nothing to import: no valid records were found.</Box>}
      />
      <Table
        variant="embedded"
        header={<Header variant="h3" counter={`(${preview.would_skip.length})`}>Skipped</Header>}
        items={preview.would_skip}
        trackBy={(s) => `${s.line}|${s.record}|${s.reason}`}
        columnDefinitions={[
          { id: "line", header: "Line", cell: (s) => s.line ?? "-", width: 70 },
          { id: "record", header: "Record", cell: (s) => stripTrailingDot(s.record) },
          { id: "reason", header: "Reason", cell: (s) => s.reason },
        ]}
        empty={<Box color="inherit">No records were skipped.</Box>}
      />
    </SpaceBetween>
  );
}
