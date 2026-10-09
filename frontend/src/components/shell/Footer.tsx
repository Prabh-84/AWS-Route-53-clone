"use client";

import Link from "@cloudscape-design/components/link";
import { colorBackgroundContainerContent, colorBorderDividerDefault, colorTextBodySecondary } from "@cloudscape-design/design-tokens";

const barStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1001,
  display: "flex",
  alignItems: "center",
  gap: 24,
  padding: "6px 20px",
  background: colorBackgroundContainerContent,
  borderTop: `1px solid ${colorBorderDividerDefault}`,
  fontSize: 12,
};

/** Visual-only footer; none of the links go anywhere. */
export function Footer() {
  return (
    <footer id="app-footer" style={barStyle}>
      <Link href="#" variant="primary" fontSize="body-s" onFollow={(e) => e.preventDefault()}>
        CloudShell
      </Link>
      <Link href="#" variant="primary" fontSize="body-s" onFollow={(e) => e.preventDefault()}>
        Feedback
      </Link>
      <span style={{ marginLeft: "auto", color: colorTextBodySecondary }}>© 2026, Amazon Web Services, Inc. or its affiliates.</span>
      <Link href="#" variant="primary" fontSize="body-s" onFollow={(e) => e.preventDefault()}>
        Privacy
      </Link>
      <Link href="#" variant="primary" fontSize="body-s" onFollow={(e) => e.preventDefault()}>
        Terms
      </Link>
      <Link href="#" variant="primary" fontSize="body-s" onFollow={(e) => e.preventDefault()}>
        Cookie preferences
      </Link>
    </footer>
  );
}
