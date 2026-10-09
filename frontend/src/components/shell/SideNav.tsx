"use client";

import SideNavigation, { type SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import { BASE, NAV_SECTIONS, TOP_LINKS } from "@/lib/nav";

/** Mirrors the real Route 53 console navigation (structure lives in lib/nav.ts). */
const items: SideNavigationProps.Item[] = [
  ...TOP_LINKS.map((leaf): SideNavigationProps.Item => ({ type: "link", text: leaf.text, href: leaf.href })),
  { type: "divider" },
  ...NAV_SECTIONS.map(
    (section): SideNavigationProps.Item => ({
      type: "section",
      text: section.text,
      defaultExpanded: true,
      items: section.items.map((leaf): SideNavigationProps.Item => ({ type: "link", text: leaf.text, href: leaf.href })),
    }),
  ),
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
