import type { Metadata } from "next";
import "@cloudscape-design/global-styles/index.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeStyle } from "@/components/ThemeStyle";

export const metadata: Metadata = {
  title: "Route 53 Management Console",
  description: "AWS Route 53 console clone",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeStyle />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
