import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CartCountProvider } from "@/components/CartCountProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCartItemCount } from "@/lib/queries/cart";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import { LOCATION, SITE_DESCRIPTION, SITE_NAME } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Pokémon cards in ${LOCATION}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Pokémon cards",
    "Pokemon cards Ottawa",
    "Pokémon singles",
    "trading cards Canada",
    "local pickup Ottawa",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialCartCount = user ? await getCartItemCount(supabase, user.id) : 0;

  return (
    <html lang="en-CA" suppressHydrationWarning>
      <head>
        <script
          // Set the theme before paint to avoid a flash of the wrong theme.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} min-h-dvh antialiased`}>
        <CartCountProvider initialCount={initialCartCount}>
          <Header />
          <main className="mx-auto min-h-[calc(100dvh-8rem)] w-full max-w-6xl px-4 py-6">
            {children}
          </main>
          <Footer />
        </CartCountProvider>
      </body>
    </html>
  );
}
