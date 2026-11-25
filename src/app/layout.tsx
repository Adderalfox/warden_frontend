import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warden — Incident Remediation",
  description: "Autonomous incident-remediation War Room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
