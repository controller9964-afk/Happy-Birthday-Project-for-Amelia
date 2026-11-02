import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CursorStars } from "@/components/cursor-stars";
import { UiProvider } from "@/components/ui-provider";
import { LoadingIntro } from "@/components/loading-intro";

export const metadata: Metadata = {
  title: "A Little Place for Amelia",
  description: "A cozy little birthday gathering for Amelia, filled with stories, music, and warm wishes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <UiProvider>
          <LoadingIntro />
          <div className="site-shell stars">
            <CursorStars />
            <SiteNav />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </UiProvider>
      </body>
    </html>
  );
}
