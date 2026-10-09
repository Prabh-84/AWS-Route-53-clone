import type { Theme } from "@cloudscape-design/components/theming";

/**
 * Cloudscape design-token overrides that recreate the classic AWS console look
 * (grey page, square outlined buttons, orange primary/active colours, blue links)
 * on top of the default visual-refresh theme.
 */
export const awsClassicTheme: Theme = {
  tokens: {
    fontFamilyBase: '"Amazon Ember", "Helvetica Neue", Roboto, Arial, sans-serif',
    fontSizeHeadingXl: "28px",
    fontWeightHeadingXl: "400",

    colorBackgroundLayoutMain: "#f2f3f3",
    colorBackgroundContainerHeader: "#fafafa",
    colorBackgroundHomeHeader: "#f2f3f3",

    borderRadiusButton: "0px",
    borderRadiusInput: "0px",
    borderRadiusContainer: "0px",
    borderRadiusDropdown: "0px",
    borderRadiusFlashbar: "0px",
    borderRadiusAlert: "0px",
    borderRadiusTabsFocusRing: "0px",

    // Normal buttons: white with a dark 1px border
    colorBackgroundButtonNormalDefault: "#ffffff",
    colorBorderButtonNormalDefault: "#545b64",
    colorTextButtonNormalDefault: "#545b64",
    colorBorderButtonNormalHover: "#16191f",
    colorTextButtonNormalHover: "#16191f",

    // Primary buttons: AWS orange
    colorBackgroundButtonPrimaryDefault: "#ec7211",
    colorBorderButtonPrimaryDefault: "#ec7211",
    colorTextButtonPrimaryDefault: "#ffffff",
    colorBackgroundButtonPrimaryHover: "#eb5f07",
    colorBackgroundButtonPrimaryActive: "#dd6b10",

    // Blue links ("Info", breadcrumbs, ...)
    colorTextLinkDefault: "#0073bb",
    colorTextLinkHover: "#003e6b",
    colorTextAccent: "#0073bb",

    // Side navigation: orange active item
    colorTextSideNavigationItemActive: "#ec7211",
    colorTextSideNavigationItemActiveCollapsed: "#ec7211",
    colorBorderItemSelected: "#ec7211",

    // Top navigation title/search sit on the dark AWS navy bar
    colorTextTopNavigationTitle: "#ffffff",
  },
};
