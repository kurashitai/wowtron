import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
      <body
        className="font-sans antialiased bg-background text-foreground"
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
