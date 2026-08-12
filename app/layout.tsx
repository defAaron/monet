import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monet — region-directed edit atelier",
  description:
    "Lasso any region of a live page, instruct a specialized agent pipeline, and apply the change in place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable}`}>
      <body
        style={
          {
            "--font-display": "var(--font-fraunces), 'Iowan Old Style', serif",
            "--font-body": "var(--font-figtree), 'Segoe UI', sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
