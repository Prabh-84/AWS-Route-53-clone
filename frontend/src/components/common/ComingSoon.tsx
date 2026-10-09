"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Icon from "@cloudscape-design/components/icon";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { BASE } from "@/lib/nav";

/** Placeholder for console areas this demo doesn't implement. Sets its own breadcrumb. */
export function ComingSoon({ title, href }: { title: string; href: string }) {
  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: title, href },
  ]);

  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Container>
        <Box textAlign="center" padding={{ vertical: "xxl" }}>
          <Box color="text-status-info">
            <Icon name="status-info" size="big" />
          </Box>
          <Box variant="h2" padding={{ top: "s" }}>
            Coming soon
          </Box>
          <Box variant="p" color="text-body-secondary">
            This feature isn&apos;t available in this demo yet.
          </Box>
        </Box>
      </Container>
    </ContentLayout>
  );
}
