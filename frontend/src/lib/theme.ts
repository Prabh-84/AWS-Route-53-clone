import type { Theme } from "@cloudscape-design/components/theming";

/** A colour that differs between light and dark mode. */
const mode = (light: string, dark: string) => ({ light, dark });

/**
 * Cloudscape design-token overrides that recreate the classic AWS console look
 * (grey page, square outlined buttons, orange primary/active colours, blue links)
 * on top of the default visual-refresh theme, in both light and dark mode.
 * Plain strings apply to both modes; {light, dark} pairs differ per mode.
 */
export const awsClassicTheme: Theme = {
  tokens: {
    fontFamilyBase: '"Amazon Ember", "Helvetica Neue", Roboto, Arial, sans-serif',
    fontSizeHeadingXl: "28px",
    fontWeightHeadingXl: "400",

    colorBackgroundLayoutMain: mode("#f2f3f3", "#0f1b2a"),
    colorBackgroundContainerHeader: mode("#fafafa", "#192534"),
    colorBackgroundHomeHeader: mode("#f2f3f3", "#0f1b2a"),

    borderRadiusButton: "0px",
    borderRadiusInput: "0px",
    borderRadiusContainer: "0px",
    borderRadiusDropdown: "0px",
    borderRadiusFlashbar: "0px",
    borderRadiusAlert: "0px",
    borderRadiusTabsFocusRing: "0px",

    // Normal buttons: outlined with a dark (light in dark mode) 1px border
    colorBackgroundButtonNormalDefault: mode("#ffffff", "#0f1b2a"),
    colorBorderButtonNormalDefault: mode("#545b64", "#d5dbdb"),
    colorTextButtonNormalDefault: mode("#545b64", "#d5dbdb"),
    colorBorderButtonNormalHover: mode("#16191f", "#ffffff"),
    colorTextButtonNormalHover: mode("#16191f", "#ffffff"),

    // Primary buttons: AWS orange in both modes
    colorBackgroundButtonPrimaryDefault: "#ec7211",
    colorBorderButtonPrimaryDefault: "#ec7211",
    colorTextButtonPrimaryDefault: "#ffffff",
    colorBackgroundButtonPrimaryHover: "#eb5f07",
    colorBackgroundButtonPrimaryActive: "#dd6b10",

    // Blue links ("Info", breadcrumbs, ...)
    colorTextLinkDefault: mode("#0073bb", "#44b9d6"),
    colorTextLinkHover: mode("#003e6b", "#6cd8f3"),
    colorTextAccent: mode("#0073bb", "#44b9d6"),

    // Side navigation: orange active item
    colorTextSideNavigationItemActive: mode("#ec7211", "#ff9900"),
    colorTextSideNavigationItemActiveCollapsed: mode("#ec7211", "#ff9900"),
    colorBorderItemSelected: mode("#ec7211", "#ff9900"),

    // Top navigation title/search sit on the dark AWS navy bar
    colorTextTopNavigationTitle: "#ffffff",
  },
};
