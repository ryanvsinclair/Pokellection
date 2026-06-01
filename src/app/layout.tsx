import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
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
    <html lang="en-CA">
      <body className={`${geistSans.variable} min-h-dvh antialiased`}>
        <Header />
        <main className="mx-auto min-h-[calc(100dvh-8rem)] w-full max-w-6xl px-4 pb-24 pt-6 md:pb-8">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
