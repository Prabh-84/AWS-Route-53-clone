"use client";

import SideNavigation, { type SideNavigationProps } from "@cloudscape-design/components/side-navigation";

const BASE = "/route53/v2";

/** Mirrors the real Route 53 console navigation. Pages that aren't built yet still get their final URL. */
const items: SideNavigationProps.Item[] = [
  { type: "link", text: "Dashboard", href: `${BASE}/dashboard` },
  { type: "link", text: "Hosted zones", href: `${BASE}/hostedzones` },
  { type: "link", text: "Health checks", href: `${BASE}/healthchecks` },
  { type: "divider" },
  {
    type: "section",
    text: "Traffic flow",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Traffic policies", href: `${BASE}/trafficpolicies` },
      { type: "link", text: "Policy records", href: `${BASE}/policyrecords` },
    ],
  },
  {
    type: "section",
    text: "Domains",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Registered domains", href: `${BASE}/domains` },
      { type: "link", text: "Pending requests", href: `${BASE}/pendingrequests` },
    ],
  },
  {
    type: "section",
    text: "Resolver",
    defaultExpanded: true,
    items: [
      { type: "link", text: "VPCs", href: `${BASE}/resolver/vpcs` },
      { type: "link", text: "Inbound endpoints", href: `${BASE}/resolver/inbound-endpoints` },
      { type: "link", text: "Outbound endpoints", href: `${BASE}/resolver/outbound-endpoints` },
      { type: "link", text: "Rules", href: `${BASE}/resolver/rules` },
      { type: "link", text: "Query logging", href: `${BASE}/resolver/query-logging` },
    ],
  },
  {
    type: "section",
    text: "DNS Firewall",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Rule groups", href: `${BASE}/firewall/rule-groups` },
      { type: "link", text: "Domain lists", href: `${BASE}/firewall/domain-lists` },
    ],
  },
  {
    type: "section",
    text: "Application Recovery Controller",
    defaultExpanded: true,
    items: [
      { type: "link", text: "Getting started", href: `${BASE}/arc/getting-started` },
      { type: "link", text: "Readiness check", href: `${BASE}/arc/readiness-check` },
      { type: "link", text: "Routing control", href: `${BASE}/arc/routing-control` },
    ],
  },
];

interface SideNavProps {
  activeHref: string;
  onFollow: SideNavigationProps["onFollow"];
}

export function SideNav({ activeHref, onFollow }: SideNavProps) {
  return (
    <SideNavigation
      header={{ text: "Route 53", href: `${BASE}/dashboard` }}
      activeHref={activeHref}
      items={items}
      onFollow={onFollow}
    />
  );
}
