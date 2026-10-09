"use client";

import Link from "@cloudscape-design/components/link";

/** The blue "Info" link the console puts next to headings and labels. Visual only for now. */
export function InfoLink() {
  return (
    <Link variant="info" href="#" onFollow={(event) => event.preventDefault()}>
      Info
    </Link>
  );
}
