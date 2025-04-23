import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AppProvider } from "@/components/app-context";

export const metadata: Metadata = {
  title: "EverydayRich Chat Application",
  description: "Real-time chat application with Socket.io",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
