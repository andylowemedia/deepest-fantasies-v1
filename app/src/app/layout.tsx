import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { Header } from "@/components/Header/Header";
import { Footer } from "@/components/Footer/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Deepest Fantasies — AI Erotic Art Gallery",
  description:
    "Explore AI-generated erotic art and share your deepest fantasies with a community of like-minded adults.",
  robots: "noindex, nofollow",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <SessionProvider session={session}>
          <Header />
          <main style={{ minHeight: "calc(100vh - var(--header-height))" }}>
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}