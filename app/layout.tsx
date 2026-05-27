import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { OfflineBanner } from "@/components/OfflineBanner"
import { ToasterProvider } from "@/components/ToasterProvider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TripBook",
  description: "Truck trip management system",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <ErrorBoundary>{children}</ErrorBoundary>
        <ToasterProvider />
      </body>
    </html>
  );
}
