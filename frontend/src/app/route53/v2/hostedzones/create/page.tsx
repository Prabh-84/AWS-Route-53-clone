"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Tiles from "@cloudscape-design/components/tiles";
import { InfoLink } from "@/components/common/InfoLink";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { VpcFields } from "@/components/zones/VpcFields";
import { useCreateZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import { createZoneSchema, type CreateZoneValues } from "@/lib/zone-schema";

const BASE = "/route53/v2";
const NAME_HINT = "Valid characters: a-z, 0-9, ! \" # $ % & ' ( ) * + , - / : ; < = > ? @ [ \\ ] ^ _ ` { | } . ~";
const MAX_COMMENT = 256;

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useNotifications();
  const createZone = useCreateZone();
  const [error, setError] = useState<string | null>(null);

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: "Create hosted zone", href: `${BASE}/hostedzones/create` },
  ]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateZoneValues>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: { name: "", comment: "", type: "PUBLIC", vpcs: [] },
  });
  const type = useWatch({ control, name: "type" });
  const commentLength = useWatch({ control, name: "comment" }).length;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const zone = await createZone.mutateAsync({
        name: values.name,
        comment: values.comment || null,
        type: values.type,
        vpcs: values.type === "PRIVATE" ? values.vpcs : [],
      });
      notify({ type: "success", content: `Successfully created hosted zone '${stripTrailingDot(zone.name)}'.` });
      router.push(`${BASE}/hostedzones/${zone.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      window.scrollTo({ top: 0 });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Form
        header={
          <Header variant="h1" info={<InfoLink />}>
            Create hosted zone
          </Header>
        }
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => router.push(`${BASE}/hostedzones`)}>
              Cancel
            </Button>
            <Button variant="primary" formAction="submit" loading={createZone.isPending}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {error && (
            <Alert type="error" header="Failed to create hosted zone" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Container
            header={
              <Header
                variant="h2"
                description="A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains."
              >
                Hosted zone configuration
              </Header>
            }
          >
            <SpaceBetween size="l">
              <FormField
                label="Domain name"
                info={<InfoLink />}
                description="This is the name of the domain that you want to route traffic for."
                constraintText={NAME_HINT}
                errorText={errors.name?.message}
              >
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      placeholder="example.com"
                      value={field.value}
                      onChange={({ detail }) => field.onChange(detail.value)}
                      onBlur={field.onBlur}
                      invalid={!!errors.name}
                      ariaLabel="Domain name"
                      autoFocus
                    />
                  )}
                />
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

              <FormField
                label="Type"
                info={<InfoLink />}
                description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC."
              >
                <Tiles
                  columns={2}
                  value={type}
                  onChange={({ detail }) => {
                    const next = detail.value as CreateZoneValues["type"];
                    setValue("type", next);
                    // Private zones start with one empty VPC row; public zones carry none.
                    setValue("vpcs", next === "PRIVATE" ? [{ region: "", vpc_id: "" }] : []);
                  }}
                  items={[
                    {
                      value: "PUBLIC",
                      label: "Public hosted zone",
                      description: "A public hosted zone determines how traffic is routed on the internet.",
                    },
                    {
                      value: "PRIVATE",
                      label: "Private hosted zone",
                      description: "A private hosted zone determines how traffic is routed within an Amazon VPC.",
                    },
                  ]}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          {type === "PRIVATE" && <VpcFields control={control} />}
        </SpaceBetween>
      </Form>
    </form>
  );
}
