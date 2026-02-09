import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppDataProvider } from "@/features/app/app-data-context";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "TU Lead Command Center",
  description: "Single-operator CRM command center",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
      </body>
    </html>
  );
}
