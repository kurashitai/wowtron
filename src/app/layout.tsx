import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/components/providers/locale-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://wowtron.gg"),
  title: "WoWtron - Raid Analysis For World of Warcraft Progression",
  description: "WoWtron turns Warcraft Logs into clear next-pull decisions for raid leaders, with deeper guild, Mythic+, and player-reliability workflows planned next.",
  keywords: ["WoW", "World of Warcraft", "Raid Analysis", "Warcraft Logs", "Raid Leader", "Progression", "Guild Tools", "Mythic+"],
  authors: [{ name: "WoWtron Team" }],
  icons: {
    icon: "/wowtron-logo.png",
    apple: "/wowtron-logo.png",
  },
  openGraph: {
    title: "WoWtron - Raid Analysis For WoW Progression",
    description: "Turn Warcraft Logs into clear next-pull decisions for raid leaders.",
    url: "https://wowtron.gg",
    siteName: "WoWtron",
    type: "website",
    images: [
      {
        url: "/wowtron-logo.png",
        width: 1200,
        height: 630,
        alt: "WoWtron - WoW Raid Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WoWtron - Raid Analysis For WoW Progression",
    description: "Turn Warcraft Logs into clear next-pull decisions for raid leaders.",
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
        <LocaleProvider>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
