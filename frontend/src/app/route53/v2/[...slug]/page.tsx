"use client";

import { notFound, useParams } from "next/navigation";
import { ComingSoon } from "@/components/common/ComingSoon";
import { BASE, PLACEHOLDER_PAGES } from "@/lib/nav";

/**
 * One shared page for every nav item that has no real page yet (see lib/nav.ts).
 * Real pages (dashboard, hostedzones/...) are more specific routes and win over this catch-all;
 * any other URL falls through to the not-found page.
 */
export default function PlaceholderPage() {
  const { slug } = useParams<{ slug: string[] }>();
  const href = `${BASE}/${slug.join("/")}`;
  const page = PLACEHOLDER_PAGES[href];
  if (!page) notFound();
  return <ComingSoon title={page.text} href={page.href} />;
}
