"use client";

import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Grid from "@cloudscape-design/components/grid";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useFollow } from "@/hooks/useFollow";

const DOMAIN_HINT =
  "Each label (each part between dots) can be up to 63 characters long and must start with a-z or 0-9. " +
  "Maximum length: 255 characters, including dots. Valid characters: a-z, 0-9, and - (hyphen)";

function Feature({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <Box textAlign="center">
      <SpaceBetween size="s">
        <Box variant="h2" fontWeight="normal" fontSize="heading-l">
          {title}
        </Box>
        <Box>{description}</Box>
        <Button onClick={onClick}>{action}</Button>
      </SpaceBetween>
    </Box>
  );
}

function Stat({ title, count, linkText }: { title: string; count: number; linkText: string }) {
  return (
    <Box textAlign="center">
      <SpaceBetween size="m">
        <Box variant="h2" fontWeight="normal" fontSize="heading-l">
          {title}
        </Box>
        <Box fontSize="display-l" fontWeight="light">
          {count}
        </Box>
        <Link href="#" onFollow={(e) => e.preventDefault()}>
          {linkText}
        </Link>
      </SpaceBetween>
    </Box>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const onFollow = useFollow();
  usePageBreadcrumbs([
    { text: "Route 53", href: "/route53/v2/dashboard" },
    { text: "Dashboard", href: "/route53/v2/dashboard" },
  ]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" info={<Link variant="info" onFollow={onFollow}>Info</Link>}>
        Route 53 Dashboard
      </Header>

      <Container>
        <SpaceBetween size="xxl">
          <Grid
            gridDefinition={[{ colspan: 3 }, { colspan: 3 }, { colspan: 3 }, { colspan: 3 }]}
          >
            <Feature
              title="DNS management"
              description="A hosted zone tells Route 53 how to respond to DNS queries for a domain such as example.com."
              action="Create hosted zone"
              onClick={() => router.push("/route53/v2/hostedzones/create")}
            />
            <Feature
              title="Traffic management"
              description="A visual tool that lets you easily create policies for multiple endpoints in complex configurations."
              action="Create policy"
            />
            <Feature
              title="Availability monitoring"
              description="Health checks monitor your applications and web resources, and direct DNS queries to healthy resources."
              action="Create health check"
            />
            <Feature
              title="Domain registration"
              description="A domain is the name, such as example.com, that your users use to access your application."
              action="Register domain"
            />
          </Grid>
          <Grid gridDefinition={[{ colspan: 3 }, { colspan: 3 }]}>
            <Stat title="Readiness check" count={0} linkText="Readiness checks" />
            <Stat title="Routing control" count={0} linkText="Control panels" />
          </Grid>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h2">Register domain</Header>}>
        <SpaceBetween size="s">
          <Box>
            Find and register an available domain, or{" "}
            <Link href="#" onFollow={(e) => e.preventDefault()}>
              transfer your existing domains
            </Link>{" "}
            to Route 53.
          </Box>
          <FormField constraintText={DOMAIN_HINT}>
            <Input value="" placeholder="Enter a domain name" onChange={() => {}} ariaLabel="Domain name" />
          </FormField>
          <Button>Check</Button>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header variant="h2" actions={<Button iconName="refresh" ariaLabel="Refresh notifications" />}>
            Notifications
          </Header>
        }
      >
        <Box color="text-body-secondary">&nbsp;</Box>
      </Container>
    </SpaceBetween>
  );
}
