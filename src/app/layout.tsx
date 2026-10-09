import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppNav } from "@/components/layout/app-nav";
import { Toaster } from "@/components/ui/sonner";
import { Freshness } from "@/components/layout/freshness";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "HOIC", template: "%s · HOIC" },
  description: "Timekeeping and crew management",
  applicationName: "HOIC",
  appleWebApp: { capable: true, title: "HOIC", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#282828",
  colorScheme: "dark",
};

import { PWAProvider } from "@/components/providers/pwa-provider";
import { SyncProvider } from "@/components/providers/sync-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark antialiased font-sans", inter.variable)}>
      <body className="flex min-h-dvh flex-col md:flex-row bg-background text-foreground">
        <PWAProvider>
          <SyncProvider>
            <AppNav />
            <main className="flex-1 w-full min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
              <Freshness />
              {children}
            </main>
            <Toaster position="top-center" richColors closeButton />
          </SyncProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
