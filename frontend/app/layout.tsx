import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket King",
  description: "Ticketing and operations system for VR experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
