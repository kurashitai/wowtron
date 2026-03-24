import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Using Inter as primary font (Cinzel not available in Google Fonts for Next.js)
const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wowtron.gg"),
  title: "WoWtron - World of Warcraft Guild Management & Mythic+ Tracker",
  description: "The ultimate all-in-one platform for World of Warcraft guild management, raid planning, Mythic+ tracking, log analysis, and player recruitment. Join thousands of guilds already using WoWtron.",
  keywords: ["WoW", "World of Warcraft", "Guild Management", "Mythic+", "Raid Planning", "Warcraft Logs", "Raider.IO", "M+ Score", "Guild Roster", "WoW Tools"],
  authors: [{ name: "WoWtron Team" }],
  icons: {
    icon: "/wowtron-logo.png",
    apple: "/wowtron-logo.png",
  },
  openGraph: {
    title: "WoWtron - Ultimate WoW Guild Management Platform",
    description: "All-in-one platform for WoW guilds. Raid planning, M+ tracking, log analysis, and recruitment.",
    url: "https://wowtron.gg",
    siteName: "WoWtron",
    type: "website",
    images: [
      {
        url: "/wowtron-logo.png",
        width: 1200,
        height: 630,
        alt: "WoWtron - WoW Guild Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WoWtron - Ultimate WoW Guild Management Platform",
    description: "All-in-one platform for WoW guilds. Raid planning, M+ tracking, log analysis, and recruitment.",
    images: ["/wowtron-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Cinzel Font for Display Text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${interSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
        style={{
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
