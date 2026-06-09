import type { Metadata } from "next";
import MUIProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Notification Hub",
  description: "Real-time Placements, Events, and Results Notification Board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MUIProvider>{children}</MUIProvider>
      </body>
    </html>
  );
}
