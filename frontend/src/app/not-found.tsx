"use client";

import Image from "next/image";
import { colorBackgroundLayoutMain } from "@cloudscape-design/design-tokens";
import { NotFoundCard } from "@/components/common/NotFoundCard";

// Root 404 (no console shell): same navy bar and grey page as the sign-in screen.
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: colorBackgroundLayoutMain }}>
      <div style={{ background: "#232f3e", height: 56, display: "flex", alignItems: "center", padding: "0 20px" }}>
        <Image src="/aws-logo.svg" alt="AWS" width={60} height={36} priority />
      </div>
      <div style={{ maxWidth: 560, margin: "64px auto 0", padding: "0 16px" }}>
        <NotFoundCard />
      </div>
    </div>
  );
}
