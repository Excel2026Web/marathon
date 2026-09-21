import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";

const BASE_URL = "https://headstart.excelmec.org";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  /* ── Core ── */
  title: {
    default: "Headstart 2.0 | 10K Mini Marathon | Excel 2026",
    template: "%s | Headstart 2.0 – Excel 2026",
  },
  description:
    "Register for Headstart 2.0, the official 10 KM mini marathon of Excel 2026 — Kerala's largest national-level collegiate techno-managerial fest. Race at Durbar Hall Ground, Ernakulam on 11 October 2026 from 6 AM.",
  keywords: [
    "Headstart 2.0",
    "Excel 2026",
    "mini marathon",
    "10K run Ernakulam",
    "marathon Kerala",
    "Durbar Hall marathon",
    "NIT Calicut fest",
    "college marathon India",
    "Excel MEC marathon",
    "run registration 2026",
  ],
  authors: [{ name: "Excel MEC", url: "https://excelmec.org" }],
  creator: "Excel MEC",
  publisher: "Excel MEC",

  /* ── Canonical ── */
  alternates: {
    canonical: "/",
  },

  /* ── Open Graph ── */
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Headstart 2.0 – Excel 2026",
    title: "Headstart 2.0 | 10K Mini Marathon | Excel 2026",
    description:
      "Join the 10 KM mini marathon at Durbar Hall, Ernakulam on 11 Oct 2026. Register now for Headstart 2.0 by Excel MEC!",
    images: [
      {
        url: "/background.jpg",
        width: 1200,
        height: 630,
        alt: "Headstart 2.0 – 10K Mini Marathon Excel 2026 at Durbar Hall",
      },
    ],
    locale: "en_IN",
  },

  /* ── Twitter / X ── */
  twitter: {
    card: "summary_large_image",
    site: "@excelmec",
    creator: "@excelmec",
    title: "Headstart 2.0 | 10K Mini Marathon | Excel 2026",
    description:
      "Run with us! Headstart 2.0 – 10 KM mini marathon at Durbar Hall, Ernakulam on 11 Oct 2026. Presented by Excel MEC.",
    images: ["/background.jpg"],
  },

  /* ── Robots ── */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  /* ── Icons ── */
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  /* ── Category ── */
  category: "sports",
};

/* ── JSON-LD Structured Data ── */
const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: "Headstart 2.0 – 10K Mini Marathon",
  description:
    "Headstart 2.0 is the official 10 KM mini marathon of Excel 2026, Kerala's largest national-level collegiate techno-managerial fest, held at Durbar Hall Ground, Ernakulam.",
  url: BASE_URL,
  startDate: "2026-10-11T06:00:00+05:30",
  endDate: "2026-10-11T11:00:00+05:30",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: "Durbar Hall Ground",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Durbar Hall Road",
      addressLocality: "Ernakulam",
      addressRegion: "Kerala",
      postalCode: "682011",
      addressCountry: "IN",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Excel MEC",
    url: "https://excelmec.org",
  },
  image: [`${BASE_URL}/background.jpg`],
  offers: {
    "@type": "Offer",
    url: `${BASE_URL}/register`,
    availability: "https://schema.org/InStock",
    validFrom: "2026-09-01",
  },
  sport: "Running",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          id="event-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
