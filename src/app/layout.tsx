import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { BootstrapProvider } from "@/lib/bootstrap/BootstrapProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <ReactQueryProvider>
          <BootstrapProvider>
            {children}
          </BootstrapProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
