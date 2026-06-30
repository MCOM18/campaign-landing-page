import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { BootstrapProvider } from "@/lib/bootstrap/BootstrapProvider";
import { ToasterProvider } from "@/components/ToasterProvider";
import { AnalyticsProvider } from "@/shared/analytics";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "JOJO Gold - Start Your 7-Day Free Trial",
  description: "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p. Start your 7-day free trial now.",
};

export default function RootLayout({
  children,
  }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ReactQueryProvider>
          <BootstrapProvider>
            <AnalyticsProvider>
              {children}
            </AnalyticsProvider>
          </BootstrapProvider>
        </ReactQueryProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
