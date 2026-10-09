"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Spinner from "@cloudscape-design/components/spinner";
import SpaceBetween from "@cloudscape-design/components/space-between";
import TagEditor, { type TagEditorProps } from "@cloudscape-design/components/tag-editor";
import Textarea from "@cloudscape-design/components/textarea";
import { InfoLink } from "@/components/common/InfoLink";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { VpcFields } from "@/components/zones/VpcFields";
import { useSetZoneTags, useUpdateZone, useZone, useZoneTags } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import type { HostedZone } from "@/lib/types";
import { editZoneSchema, type EditZoneValues } from "@/lib/zone-schema";

const BASE = "/route53/v2";
const MAX_COMMENT = 256;

const tagI18n: TagEditorProps.I18nStrings = {
  keyPlaceholder: "Enter key",
  valuePlaceholder: "Enter value",
  addButton: "Add new tag",
  removeButton: "Remove",
  undoButton: "Undo",
  undoPrompt: "This tag will be removed upon saving changes",
  loading: "Loading tags that are associated with this resource",
  keyHeader: "Key",
  valueHeader: "Value",
  optional: "optional",
  keySuggestion: "Custom tag key",
  valueSuggestion: "Custom tag value",
  emptyTags: "No tags associated with the resource.",
  tooManyKeysSuggestion: "You have more keys than can be displayed",
  tooManyValuesSuggestion: "You have more values than can be displayed",
  keysSuggestionLoading: "Loading tag keys",
  keysSuggestionError: "Tag keys could not be retrieved",
  valuesSuggestionLoading: "Loading tag values",
  valuesSuggestionError: "Tag values could not be retrieved",
  emptyKeyError: "You must specify a tag key",
  maxKeyCharLengthError: "The maximum number of characters you can use in a tag key is 128.",
  maxValueCharLengthError: "The maximum number of characters you can use in a tag value is 256.",
  duplicateKeyError: "You must specify a unique tag key.",
  invalidKeyError: "Invalid key. Keys can only contain unicode letters, digits, white space and any of the following: _.:/=+@-",
  invalidValueError: "Invalid value. Values can only contain unicode letters, digits, white space and any of the following: _.:/=+@-",
  awsPrefixError: "Cannot start with aws:",
  tagLimit: (availableTags, tagLimit) =>
    availableTags === tagLimit
      ? `You can add up to ${tagLimit} tags.`
      : `You can add up to ${availableTags} more tag${availableTags === 1 ? "" : "s"}.`,
  tagLimitReached: (tagLimit) => `You have reached the limit of ${tagLimit} tags.`,
  tagLimitExceeded: (tagLimit) => `You have exceeded the limit of ${tagLimit} tags.`,
  enteredKeyLabel: (key) => `Use "${key}"`,
  enteredValueLabel: (value) => `Use "${value}"`,
};

const toEditorTags = (tags: Record<string, string>): TagEditorProps.Tag[] =>
  Object.entries(tags).map(([key, value]) => ({ key, value, existing: true }));

const fromEditorTags = (tags: readonly TagEditorProps.Tag[]): Record<string, string> =>
  Object.fromEntries(tags.filter((t) => !t.markedForRemoval && t.key.trim()).map((t) => [t.key.trim(), t.value]));

const sameTags = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

function EditZoneForm({ zone, initialTags }: { zone: HostedZone; initialTags: Record<string, string> }) {
  const router = useRouter();
  const { notify } = useNotifications();
  const updateZone = useUpdateZone(zone.id);
  const setTags = useSetZoneTags(zone.id);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTagList] = useState<readonly TagEditorProps.Tag[]>(() => toEditorTags(initialTags));
  const [tagsValid, setTagsValid] = useState(true);
  const isPrivate = zone.type === "PRIVATE";
  const name = stripTrailingDot(zone.name);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditZoneValues>({
    resolver: zodResolver(editZoneSchema(isPrivate)),
    defaultValues: { comment: zone.comment, vpcs: zone.vpcs.map((v) => ({ region: v.region, vpc_id: v.vpc_id })) },
  });
  const commentLength = useWatch({ control, name: "comment" }).length;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (!tagsValid) {
      setError("Fix the errors in the tags before saving.");
      return;
    }
    const nextTags = fromEditorTags(tags);
    const tagsChanged = !sameTags(nextTags, initialTags);

    try {
      await updateZone.mutateAsync({ comment: values.comment, ...(isPrivate ? { vpcs: values.vpcs } : {}) });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      return;
    }
    if (tagsChanged) {
      try {
        await setTags.mutateAsync(nextTags);
      } catch (e) {
        const reason = e instanceof ApiError ? e.message : "Something went wrong.";
        setError(`The hosted zone was updated, but its tags could not be saved: ${reason}`);
        return;
      }
    }
    notify({
      type: "success",
      content: `Successfully updated hosted zone '${name}'${tagsChanged ? " and its tags" : ""}.`,
    });
    router.push(`${BASE}/hostedzones`);
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Form
        header={
          <Header variant="h1" info={<InfoLink />}>
            Edit hosted zone
          </Header>
        }
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => router.push(`${BASE}/hostedzones`)}>
              Cancel
            </Button>
            <Button variant="primary" formAction="submit" loading={updateZone.isPending || setTags.isPending}>
              Save changes
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {error && (
            <Alert type="error" header="Failed to edit hosted zone" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
            <SpaceBetween size="l">
              <FormField label="Domain name" description="The domain name can't be changed after the hosted zone is created.">
                <Box variant="p">{name}</Box>
              </FormField>

              <FormField label="Type" description="The type can't be changed after the hosted zone is created.">
                <Box variant="p">{isPrivate ? "Private hosted zone" : "Public hosted zone"}</Box>
              </FormField>

              <FormField
                label={
                  <>
                    Description - <em>optional</em>
                  </>
                }
                info={<InfoLink />}
                description="This value lets you distinguish hosted zones that have the same name."
                constraintText={`The description can have up to ${MAX_COMMENT} characters. ${commentLength}/${MAX_COMMENT}`}
                errorText={errors.comment?.message}
              >
                <Controller
                  control={control}
                  name="comment"
                  render={({ field }) => (
                    <Textarea
                      placeholder="The hosted zone is used for..."
                      value={field.value}
                      onChange={({ detail }) => field.onChange(detail.value)}
                      onBlur={field.onBlur}
                      invalid={!!errors.comment}
                      rows={3}
                      ariaLabel="Description"
                    />
                  )}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          {isPrivate && <VpcFields control={control} />}

          <Container header={<Header variant="h2" description="A tag is a label that you assign to an AWS resource.">Tags</Header>}>
            <TagEditor
              tags={tags}
              onChange={({ detail }) => {
                setTagList(detail.tags);
                setTagsValid(detail.valid);
              }}
              i18nStrings={tagI18n}
              tagLimit={50}
            />
          </Container>
        </SpaceBetween>
      </Form>
    </form>
  );
}

export default function EditHostedZonePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const zone = useZone(zoneId);
  const tags = useZoneTags(zoneId);

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: zone.data ? stripTrailingDot(zone.data.name) : zoneId, href: `${BASE}/hostedzones/${zoneId}` },
    { text: "Edit hosted zone", href: `${BASE}/hostedzones/${zoneId}/edit` },
  ]);

  const failure = zone.error ?? tags.error;
  if (failure) {
    return (
      <Alert type="error" header="Unable to load the hosted zone">
        {failure instanceof ApiError ? failure.message : "Something went wrong. Please try again."}
      </Alert>
    );
  }
  if (!zone.data || !tags.data) return <Spinner size="large" />;
  return <EditZoneForm zone={zone.data} initialTags={tags.data} />;
}
