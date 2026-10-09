"use client";

import { generateThemeStylesheet } from "@cloudscape-design/components/theming";
import { awsClassicTheme } from "@/lib/theme";

// Computed once. Rendering it as a <style> element means it is part of the server-rendered HTML,
// so the classic theme is in the first paint (no flash of the default theme).
const themeCss = generateThemeStylesheet({ theme: awsClassicTheme });

export function ThemeStyle() {
  return <style id="aws-classic-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />;
}
