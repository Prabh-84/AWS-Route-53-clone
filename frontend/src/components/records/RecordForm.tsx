"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import { InfoLink } from "@/components/common/InfoLink";
import { MOCK_REGIONS } from "@/lib/mock-vpcs";
import {
  ALIAS_TYPES,
  RECORD_TYPES,
  ROUTING_POLICIES,
  ROUTING_POLICY_LABELS,
  TTL_PRESETS,
  TYPE_DESCRIPTIONS,
  VALUE_PLACEHOLDERS,
  emptyBlock,
  recordFormSchema,
  type RecordBlockValues,
  type RecordFormValues,
} from "@/lib/record-form";
import type { RecordType } from "@/lib/types";

interface RecordFormProps {
  mode: "create" | "edit";
  zoneId: string;
  /** Zone name as displayed (no trailing dot); used for the name suffix. */
  zoneName: string;
  initialValues?: RecordBlockValues;
  submitting: boolean;
  /** Backend (or other) error to show in an Alert at the top of the form. */
  error: string | null;
  onDismissError: () => void;
  onSubmit: (blocks: RecordBlockValues[]) => void | Promise<void>;
  onCancel: () => void;
}

// --- small controlled-field helpers so each block stays readable -------------------------------
type FieldName = FieldPath<RecordFormValues>;

function TextInput({ name, ...rest }: { name: FieldName } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "name">) {
  const { control } = useFormContext<RecordFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input {...rest} value={String(field.value ?? "")} onChange={({ detail }) => field.onChange(detail.value)} onBlur={field.onBlur} />
      )}
    />
  );
}

function TextAreaInput({ name, ...rest }: { name: FieldName } & Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "onBlur" | "name">) {
  const { control } = useFormContext<RecordFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Textarea {...rest} value={String(field.value ?? "")} onChange={({ detail }) => field.onChange(detail.value)} onBlur={field.onBlur} />
      )}
    />
  );
}

function SelectInput({
  name,
  options,
  placeholder,
  onValueChange,
  ...rest
}: {
  name: FieldName;
  options: { value: string; label: string }[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const { control } = useFormContext<RecordFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          {...rest}
          placeholder={placeholder}
          selectedOption={options.find((o) => o.value === field.value) ?? null}
          options={options}
          onChange={({ detail }) => {
            const value = detail.selectedOption.value ?? "";
            field.onChange(value);
            onValueChange?.(value);
          }}
        />
      )}
    />
  );
}

// --- one record's fields -----------------------------------------------------------------------
function RecordBlockFields({ index, mode, zoneName }: { index: number; mode: "create" | "edit"; zoneName: string }) {
  const { control, setValue, formState } = useFormContext<RecordFormValues>();
  const block = useWatch({ control, name: `records.${index}` });
  const errors = formState.errors.records?.[index];
  const path = (field: keyof RecordBlockValues) => `records.${index}.${field}` as FieldName;

  const canAlias = ALIAS_TYPES.includes(block.type);
  const alias = block.alias && canAlias;
  const policy = block.routingPolicy;

  return (
    <SpaceBetween size="l">
      <FormField
        label="Record name"
        info={<InfoLink />}
        description={mode === "create" ? "Keep blank to create a record for the root domain." : undefined}
        errorText={errors?.name?.message}
      >
        {mode === "edit" ? (
          <Box variant="p">{block.name}</Box>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <TextInput name={path("name")} placeholder="www" invalid={!!errors?.name} ariaLabel="Record name" />
            </div>
            <Box color="text-body-secondary">.{zoneName}</Box>
          </div>
        )}
      </FormField>

      <FormField
        label="Record type"
        info={<InfoLink />}
        description={mode === "create" ? TYPE_DESCRIPTIONS[block.type] : undefined}
        errorText={errors?.type?.message}
      >
        {mode === "edit" ? (
          <Box variant="p">{block.type}</Box>
        ) : (
          <SelectInput
            name={path("type")}
            ariaLabel="Record type"
            options={RECORD_TYPES.map((type) => ({ value: type, label: type }))}
            invalid={!!errors?.type}
            onValueChange={(value) => {
              // Alias is only offered for some types; turn it off when switching to one that can't.
              if (!ALIAS_TYPES.includes(value)) setValue(path("alias"), false as never);
            }}
          />
        )}
      </FormField>

      {canAlias && (
        <FormField errorText={errors?.alias?.message}>
          <Controller
            control={control}
            name={path("alias")}
            render={({ field }) => (
              <Toggle checked={!!field.value} onChange={({ detail }) => field.onChange(detail.checked)}>
                Alias
              </Toggle>
            )}
          />
        </FormField>
      )}

      {alias ? (
        <>
          <FormField label="Route traffic to" info={<InfoLink />} description="Enter the DNS name of the resource, for example a CloudFront distribution or load balancer." errorText={errors?.aliasDnsName?.message}>
            <TextInput name={path("aliasDnsName")} placeholder="d111111abcdef8.cloudfront.net" invalid={!!errors?.aliasDnsName} ariaLabel="Route traffic to" />
          </FormField>
          <Controller
            control={control}
            name={path("evaluateTargetHealth")}
            render={({ field }) => (
              <Toggle checked={!!field.value} onChange={({ detail }) => field.onChange(detail.checked)}>
                Evaluate target health
              </Toggle>
            )}
          />
        </>
      ) : (
        <>
          <FormField label="Value" info={<InfoLink />} description="Enter multiple values on separate lines." errorText={errors?.valuesText?.message}>
            <TextAreaInput name={path("valuesText")} placeholder={VALUE_PLACEHOLDERS[block.type as RecordType]} rows={4} invalid={!!errors?.valuesText} ariaLabel="Value" />
          </FormField>

          <FormField label="TTL (seconds)" info={<InfoLink />} description="Recommended values: 60 to 172800 (two days)." errorText={errors?.ttl?.message}>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <div style={{ width: 160 }}>
                <TextInput name={path("ttl")} type="number" inputMode="numeric" invalid={!!errors?.ttl} ariaLabel="TTL (seconds)" />
              </div>
              {TTL_PRESETS.map((preset) => (
                <Button key={preset.label} onClick={() => setValue(path("ttl"), String(preset.seconds) as never, { shouldValidate: true, shouldDirty: true })}>
                  {preset.label}
                </Button>
              ))}
            </SpaceBetween>
          </FormField>
        </>
      )}

      <FormField label="Routing policy" info={<InfoLink />} description="Choose how Route 53 responds to queries." stretch={false}>
        <SelectInput
          name={path("routingPolicy")}
          ariaLabel="Routing policy"
          options={ROUTING_POLICIES.map((p) => ({ value: p, label: ROUTING_POLICY_LABELS[p] }))}
        />
      </FormField>

      {policy === "WEIGHTED" && (
        <FormField label="Weight" description="A value from 0 to 255." errorText={errors?.weight?.message}>
          <div style={{ width: 160 }}>
            <TextInput name={path("weight")} type="number" inputMode="numeric" invalid={!!errors?.weight} ariaLabel="Weight" />
          </div>
        </FormField>
      )}
      {policy === "LATENCY" && (
        <FormField label="Region" description="Route 53 routes queries to the region with the lowest latency." errorText={errors?.region?.message}>
          <SelectInput
            name={path("region")}
            ariaLabel="Region"
            placeholder="Choose region"
            options={MOCK_REGIONS.map((r) => ({ value: r.region, label: `${r.label} [${r.region}]` }))}
            invalid={!!errors?.region}
          />
        </FormField>
      )}
      {policy === "FAILOVER" && (
        <FormField label="Failover record type" errorText={errors?.failover?.message}>
          <SelectInput
            name={path("failover")}
            ariaLabel="Failover record type"
            placeholder="Choose failover record type"
            options={[
              { value: "PRIMARY", label: "Primary" },
              { value: "SECONDARY", label: "Secondary" },
            ]}
            invalid={!!errors?.failover}
          />
        </FormField>
      )}
      {policy === "GEOLOCATION" && (
        <FormField
          label="Location"
          description="Enter a continent code (e.g. EU), a country code (e.g. US), a country-subdivision code (e.g. US-CA), or * for the default location."
          errorText={errors?.geoLocation?.message}
        >
          <TextInput name={path("geoLocation")} placeholder="US" invalid={!!errors?.geoLocation} ariaLabel="Location" />
        </FormField>
      )}

      {policy !== "SIMPLE" && (
        <FormField
          label="Record ID"
          info={<InfoLink />}
          description="Enter a value that uniquely identifies this record among the records with the same name and type."
          errorText={errors?.setIdentifier?.message}
        >
          <TextInput name={path("setIdentifier")} invalid={!!errors?.setIdentifier} ariaLabel="Record ID" />
        </FormField>
      )}
    </SpaceBetween>
  );
}

// --- the form ----------------------------------------------------------------------------------
export function RecordForm({ mode, zoneId, zoneName, initialValues, submitting, error, onDismissError, onSubmit, onCancel }: RecordFormProps) {
  const [schema] = useState(() => recordFormSchema(mode));
  const methods = useForm<RecordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { records: [initialValues ?? emptyBlock(zoneId)] },
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: "records" });
  const isCreate = mode === "create";

  const submit = methods.handleSubmit((values) => onSubmit(values.records));

  return (
    <FormProvider {...methods}>
      <form onSubmit={submit} noValidate>
        <Form
          header={
            <Header variant="h1" info={<InfoLink />}>
              {isCreate ? "Create record" : "Edit record"}
            </Header>
          }
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="primary" formAction="submit" loading={submitting}>
                {isCreate ? "Create records" : "Save"}
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {error && (
              <Alert type="error" header={isCreate ? "Failed to create records" : "Failed to save record"} dismissible onDismiss={onDismissError}>
                {error}
              </Alert>
            )}

            {fields.map((field, index) => (
              <Container
                key={field.id}
                header={
                  <Header
                    variant="h2"
                    actions={
                      isCreate && fields.length > 1 ? (
                        <Button iconName="remove" variant="icon" ariaLabel={`Remove record ${index + 1}`} onClick={() => remove(index)} />
                      ) : undefined
                    }
                  >
                    {isCreate ? (fields.length > 1 ? `Record ${index + 1}` : "Quick create record") : "Record details"}
                  </Header>
                }
              >
                <RecordBlockFields index={index} mode={mode} zoneName={zoneName} />
              </Container>
            ))}

            {isCreate && (
              <div>
                <Button iconName="add-plus" onClick={() => append(emptyBlock(zoneId))}>
                  Add another record
                </Button>
              </div>
            )}
          </SpaceBetween>
        </Form>
      </form>
    </FormProvider>
  );
}
