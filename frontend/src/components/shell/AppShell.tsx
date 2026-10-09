"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Flashbar from "@cloudscape-design/components/flashbar";
import HelpPanel from "@cloudscape-design/components/help-panel";
import Icon from "@cloudscape-design/components/icon";
import Input from "@cloudscape-design/components/input";
import Spinner from "@cloudscape-design/components/spinner";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useAuth } from "@/hooks/useAuth";
import { useColorMode } from "@/hooks/useColorMode";
import { useFollow } from "@/hooks/useFollow";
import { useBreadcrumbItems } from "./BreadcrumbProvider";
import { Footer } from "./Footer";
import { SideNav } from "./SideNav";
import { useNotifications } from "./NotificationProvider";

const SEARCH_PLACEHOLDER = "Search for services, features, blogs, docs, and more [Option+S]";

const sunIcon = (
  <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
    <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
const moonIcon = (
  <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
    <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const servicesButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  color: "#ffffff",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onFollow = useFollow();
  const { items: flashItems } = useNotifications();
  const breadcrumbs = useBreadcrumbItems();
  const { mode, toggle } = useColorMode();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/signin");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <>
      <div id="top-nav" style={{ position: "sticky", top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{
            href: "/route53/v2/dashboard",
            logo: { src: "/aws-logo.svg", alt: "AWS" },
            onFollow,
          }}
          search={
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <button type="button" style={servicesButtonStyle}>
                <Icon name="view-full" />
                Services
              </button>
              <div style={{ flex: 1 }}>
                <Input type="search" value="" placeholder={SEARCH_PLACEHOLDER} ariaLabel="Search" onChange={() => {}} />
              </div>
            </div>
          }
          utilities={[
            {
              type: "button",
              iconSvg: mode === "dark" ? sunIcon : moonIcon,
              ariaLabel: mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
              title: mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
              onClick: toggle,
            },
            { type: "button", iconName: "notification", ariaLabel: "Notifications", title: "Notifications" },
            { type: "button", iconName: "status-info", ariaLabel: "Help", title: "Help" },
            {
              type: "menu-dropdown",
              text: "Global",
              ariaLabel: "Region",
              items: [{ id: "global", text: "Global" }],
            },
            {
              type: "menu-dropdown",
              text: user.display_name,
              description: `Account ID: ${user.account_id}`,
              ariaLabel: "Account",
              items: [{ id: "signout", text: "Sign out" }],
              onItemClick: ({ detail }) => {
                if (detail.id === "signout") void logout();
              },
            },
          ]}
          i18nStrings={{
            searchIconAriaLabel: "Search",
            searchDismissIconAriaLabel: "Close search",
            overflowMenuTriggerText: "More",
            overflowMenuTitleText: "All",
            overflowMenuBackIconAriaLabel: "Back",
            overflowMenuDismissIconAriaLabel: "Close menu",
          }}
        />
      </div>

      <AppLayout
        headerSelector="#top-nav"
        footerSelector="#app-footer"
        navigation={<SideNav activeHref={pathname} onFollow={onFollow} />}
        breadcrumbs={
          breadcrumbs.length > 0 ? (
            <BreadcrumbGroup items={breadcrumbs} onFollow={onFollow} ariaLabel="Breadcrumbs" expandAriaLabel="Show path" />
          ) : undefined
        }
        notifications={flashItems.length > 0 ? <Flashbar items={flashItems} /> : undefined}
        tools={
          <HelpPanel header={<h2>Route 53</h2>}>
            <p>Amazon Route 53 is a highly available and scalable cloud Domain Name System (DNS) web service.</p>
          </HelpPanel>
        }
        toolsOpen={false}
        onToolsChange={() => {}}
        content={children}
        ariaLabels={{ navigation: "Navigation drawer", navigationClose: "Close navigation drawer", navigationToggle: "Open navigation drawer", toolsClose: "Close help panel", toolsToggle: "Open help panel" }}
      />

      <Footer />
    </>
  );
}
