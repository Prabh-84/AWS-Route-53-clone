"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface FollowEvent {
  preventDefault: () => void;
  detail: { href?: string; external?: boolean; target?: string };
}

/** onFollow handler for Cloudscape links/breadcrumbs/navigation that does client-side routing. */
export function useFollow() {
  const router = useRouter();
  return useCallback(
    (event: { detail: FollowEvent["detail"]; preventDefault: () => void }) => {
      const { href, external, target } = event.detail;
      if (!href || external || target === "_blank" || href === "#") {
        if (href === "#") event.preventDefault();
        return;
      }
      event.preventDefault();
      router.push(href);
    },
    [router],
  );
}
