"use client";

import { useState } from "react";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Spinner from "@cloudscape-design/components/spinner";
import TagEditor, { type TagEditorProps } from "@cloudscape-design/components/tag-editor";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { useSetZoneTags, useZoneTags } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { fromEditorTags, sameTags, tagI18n, toEditorTags } from "@/lib/tag-editor";

function TagsEditor({ zoneId, zoneName, initialTags }: { zoneId: string; zoneName: string; initialTags: Record<string, string> }) {
  const { notify } = useNotifications();
  const setTags = useSetZoneTags(zoneId);
  const [tags, setTagList] = useState<readonly TagEditorProps.Tag[]>(() => toEditorTags(initialTags));
  const [valid, setValid] = useState(true);
  const next = fromEditorTags(tags);
  const dirty = !sameTags(next, initialTags);

  const save = async () => {
    try {
      const saved = await setTags.mutateAsync(next);
      setTagList(toEditorTags(saved.tags)); // drop "marked for removal" rows and re-mark everything as saved
      notify({ type: "success", content: `Successfully updated tags for hosted zone '${zoneName}'.` });
    } catch (e) {
      notify({
        type: "error",
        header: `Failed to update tags for hosted zone '${zoneName}'`,
        content: e instanceof ApiError ? e.message : "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="A tag is a label that you assign to an AWS resource."
          actions={
            <Button variant="primary" disabled={!dirty || !valid} loading={setTags.isPending} onClick={save}>
              Save changes
            </Button>
          }
        >
          Tags
        </Header>
      }
    >
      <TagEditor
        tags={tags}
        onChange={({ detail }) => {
          setTagList(detail.tags);
          setValid(detail.valid);
        }}
        i18nStrings={tagI18n}
        tagLimit={50}
      />
    </Container>
  );
}

export function ZoneTagsTab({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  const tags = useZoneTags(zoneId);
  if (tags.error) {
    return <ErrorAlert error={tags.error} header="Unable to load tags" onRetry={() => void tags.refetch()} retrying={tags.isFetching} />;
  }
  if (!tags.data) return <Spinner />;
  // Keyed by the saved tags so the editor resets after a successful save.
  return <TagsEditor key={JSON.stringify(tags.data)} zoneId={zoneId} zoneName={zoneName} initialTags={tags.data} />;
}
