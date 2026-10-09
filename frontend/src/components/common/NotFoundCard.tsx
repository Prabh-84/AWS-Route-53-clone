"use client";

import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { BASE } from "@/lib/nav";

export function NotFoundCard() {
  const router = useRouter();
  return (
    <Container header={<Header variant="h1">Page not found</Header>}>
      <SpaceBetween size="m">
        <Box variant="p">The page you&apos;re looking for doesn&apos;t exist or has been moved.</Box>
        <Button variant="primary" onClick={() => router.push(`${BASE}/dashboard`)}>
          Go to the Route 53 dashboard
        </Button>
      </SpaceBetween>
    </Container>
  );
}
