import "@/lib/utils/suppressConsole";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { BootstrapProvider } from "@/lib/bootstrap/BootstrapProvider";
import { ToasterProvider } from "@/components/ToasterProvider";
import { AnalyticsProvider } from "@/shared/analytics";
import { StatusLine } from "@/components/StatusLine";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "JOJO Gold - Start Your 7-Day Free Trial",
  description: "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p. Start your 7-day free trial now.",
  keywords: [
    "JOJO Gold",
    "JOJO Gold Premium",
    "7-day free trial",
    "premium streaming",
    "no video ads",
    "watch on 4 devices",
    "Full HD streaming",
    "exclusive movies",
    "JOJO subscription",
    "unlimited streaming"
  ],
  alternates: {
    canonical: "https://jojoapp.in",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "JOJO Gold - Start Your 7-Day Free Trial",
    description: "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p. Start your 7-day free trial now.",
    url: "https://jojoapp.in",
    siteName: "JOJO",
    images: [
      {
        url: "https://cdn.thesupercms.com/app_media/sub/Watch-on-upto-4-Devices.png",
        width: 1200,
        height: 630,
        alt: "JOJO Gold Premium Subscription Details",
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JOJO Gold - Start Your 7-Day Free Trial",
    description: "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p. Start your 7-day free trial now.",
    images: ["https://cdn.thesupercms.com/app_media/sub/Watch-on-upto-4-Devices.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured JSON-LD Data for SEO
  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JOJO Gold",
    "url": "https://jojoapp.in",
    "description": "Start your 7-day free trial of JOJO Gold. Access exclusive premium content, enjoy ad-free videos, stream on up to 4 devices, and watch in 1080p Full HD.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://jojoapp.in/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "JOJO Gold Premium Subscription Plan",
    "image": "https://cdn.thesupercms.com/app_media/sub/Watch-on-upto-4-Devices.png",
    "description": "Get unlimited access to JOJO Gold. Enjoy exclusive premium content, no video ads, watch on up to 4 devices simultaneously, and stream in Full HD 1080p.",
    "brand": {
      "@type": "Brand",
      "name": "JOJO"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": "99",
      "highPrice": "499",
      "offerCount": "2",
      "offers": [
        {
          "@type": "Offer",
          "name": "JOJO Gold 1 Month Plan",
          "price": "99",
          "priceCurrency": "INR",
          "category": "Subscription"
        },
        {
          "@type": "Offer",
          "name": "JOJO Gold 12 Months Plan",
          "price": "499",
          "priceCurrency": "INR",
          "category": "Subscription"
        }
      ]
    }
  };

  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
        />
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
               n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '2043234696276290'); 
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning> 
        <noscript>
          <img height="1" width="1" style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2043234696276290&ev=PageView&noscript=1"
          />
        </noscript>
        {/* Cache bust: {process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_PIXEL} */}
        <ReactQueryProvider>
          <BootstrapProvider>
            <AnalyticsProvider>
              {children}
              <StatusLine />
            </AnalyticsProvider>
          </BootstrapProvider>
        </ReactQueryProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
