// The frame around every page: fonts, header, footer and the data-fetching provider.

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SepsisWatch",
    template: "%s · SepsisWatch",
  },
  description:
    "Explore synthetic vital signs, illustrative warning scores, and interactive patient timelines in the SepsisWatch research prototype.",
};

export const viewport: Viewport = {
  themeColor: "#f5f7f7",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Providers>
          <SiteHeader />
          <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
          <footer className="site-footer">
            <div className="footer-inner">
              <div><span className="footer-label">Built for earlier awareness.</span><p>SepsisWatch · Congressional App Challenge</p></div>
              <p className="footer-disclaimer">Research prototype: synthetic demos and separate retrospective ICU research. Not validated for medical use. A low score must not delay seeking medical help.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
