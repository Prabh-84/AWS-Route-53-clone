"use client";

import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import SpaceBetween from "@cloudscape-design/components/space-between";
import type { HostedZone } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children}</div>
    </div>
  );
}

export function ZoneDetailsCard({ zone, nameServers }: { zone: HostedZone; nameServers: string[] | undefined }) {
  return (
    <ExpandableSection variant="container" headerText="Hosted zone details" defaultExpanded>
      <ColumnLayout columns={3} variant="text-grid">
        <SpaceBetween size="l">
          <Field label="Hosted zone ID">
            <Box variant="code">{zone.id}</Box>
          </Field>
          <Field label="Description">{zone.comment || "-"}</Field>
        </SpaceBetween>
        <SpaceBetween size="l">
          <Field label="Type">
            <Badge color={zone.type === "PUBLIC" ? "blue" : "grey"}>{zone.type === "PUBLIC" ? "Public" : "Private"}</Badge>
          </Field>
          <Field label="Record count">{zone.record_count}</Field>
        </SpaceBetween>
        <Field label="Name servers">
          {nameServers === undefined ? (
            "-"
          ) : (
            <SpaceBetween size="xxs">
              {nameServers.map((server) => (
                <CopyToClipboard
                  key={server}
                  variant="inline"
                  textToCopy={server}
                  copyButtonAriaLabel={`Copy ${server}`}
                  copySuccessText="Name server copied"
                  copyErrorText="Name server failed to copy"
                />
              ))}
            </SpaceBetween>
          )}
        </Field>
      </ColumnLayout>
    </ExpandableSection>
  );
}
