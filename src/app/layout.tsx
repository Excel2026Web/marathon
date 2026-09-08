import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Headstart 2.0 | 10K Mini Marathon | Excel 2026",
  description: "Join Headstart 2.0, the 10K mini marathon running at Durbar Hall on 11th Oct 2026 conducted by Excel 2026",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
