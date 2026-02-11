import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/lib/store/StoreProvider";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { validateEnv } from "@/lib/env";

// Validate environment variables on server-side only
if (typeof window === 'undefined') validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PurchaseTracker - Admin Dashboard",
  description: "Track and manage employee purchases",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <StoreProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
