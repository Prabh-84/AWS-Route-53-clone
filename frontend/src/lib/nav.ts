// Single source of truth for the Route 53 side navigation and for the placeholder pages behind it.

export const BASE = "/route53/v2";

export interface NavLeaf {
  text: string;
  href: string;
}

export interface NavSection {
  text: string;
  items: NavLeaf[];
}

export const TOP_LINKS: NavLeaf[] = [
  { text: "Dashboard", href: `${BASE}/dashboard` },
  { text: "Hosted zones", href: `${BASE}/hostedzones` },
  { text: "Health checks", href: `${BASE}/healthchecks` },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    text: "Traffic flow",
    items: [
      { text: "Traffic policies", href: `${BASE}/trafficpolicies` },
      { text: "Policy records", href: `${BASE}/policyrecords` },
    ],
  },
  {
    text: "Domains",
    items: [
      { text: "Registered domains", href: `${BASE}/domains` },
      { text: "Pending requests", href: `${BASE}/pendingrequests` },
    ],
  },
  {
    text: "Resolver",
    items: [
      { text: "VPCs", href: `${BASE}/resolver/vpcs` },
      { text: "Inbound endpoints", href: `${BASE}/resolver/inbound-endpoints` },
      { text: "Outbound endpoints", href: `${BASE}/resolver/outbound-endpoints` },
      { text: "Rules", href: `${BASE}/resolver/rules` },
      { text: "Query logging", href: `${BASE}/resolver/query-logging` },
    ],
  },
  {
    text: "DNS Firewall",
    items: [
      { text: "Rule groups", href: `${BASE}/firewall/rule-groups` },
      { text: "Domain lists", href: `${BASE}/firewall/domain-lists` },
    ],
  },
  {
    text: "Application Recovery Controller",
    items: [
      { text: "Getting started", href: `${BASE}/arc/getting-started` },
      { text: "Readiness check", href: `${BASE}/arc/readiness-check` },
      { text: "Routing control", href: `${BASE}/arc/routing-control` },
    ],
  },
];

/** Nav items that have a real page of their own. Everything else renders <ComingSoon />. */
const IMPLEMENTED = new Set([`${BASE}/dashboard`, `${BASE}/hostedzones`]);

/** href -> nav entry, for every nav item that is still a placeholder. */
export const PLACEHOLDER_PAGES: Record<string, NavLeaf> = Object.fromEntries(
  [...TOP_LINKS, ...NAV_SECTIONS.flatMap((section) => section.items)]
    .filter((leaf) => !IMPLEMENTED.has(leaf.href))
    .map((leaf) => [leaf.href, leaf]),
);
