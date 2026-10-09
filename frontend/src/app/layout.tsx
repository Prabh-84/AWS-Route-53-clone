import type { Metadata } from "next";
import "@cloudscape-design/global-styles/index.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeStyle } from "@/components/ThemeStyle";

export const metadata: Metadata = {
  title: "Route 53 Management Console",
  description: "AWS Route 53 console clone",
};

// Runs before the page body is painted so a saved dark-mode choice doesn't flash light first.
// Keep the storage key in sync with COLOR_MODE_KEY in hooks/useColorMode.ts.
const applySavedModeScript = `try{if(localStorage.getItem("r53-color-mode")==="dark"){document.body.classList.add("awsui-dark-mode")}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeStyle />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: applySavedModeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
