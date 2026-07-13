import type { Metadata } from "next";
import { Cinzel, Inter, IBM_Plex_Mono } from "next/font/google";
import "@/styles/design-tokens.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AnonMigration } from "@/components/anon-migration";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["500", "600"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Trial Forge",
  description: "Dead by Daylight 配信企画ポータル",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="dark">
      <body className={`${cinzel.variable} ${inter.variable} ${plexMono.variable}`}>
        <Providers>
          <AnonMigration />
          {children}
        </Providers>
      </body>
    </html>
  );
}
