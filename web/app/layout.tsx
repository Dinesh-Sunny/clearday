import type { Metadata } from "next";
import "./globals.css";
import "./clearday.css";

export const metadata: Metadata = {
  title: "Clearday",
  description: "A finance agent on Seapoint that hands you the fix, not the alert.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
