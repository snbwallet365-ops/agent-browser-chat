import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Browser | Autonomous Browsing Agents",
  description: "ChatGPT-style interface for running and monitoring autonomous web browsing agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}