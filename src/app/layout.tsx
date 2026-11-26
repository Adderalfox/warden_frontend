import type { Metadata } from "next";
import AppShell from "@/components/shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warden — Incident Remediation",
  description: "Autonomous incident-remediation War Room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
