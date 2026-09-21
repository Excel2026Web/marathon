// This layout wraps only the /register route and injects its own metadata.
// The actual UI is rendered by the sibling page.tsx (client component).
import type { Metadata } from "next";

const BASE_URL = "https://headstart.excelmec.org";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Sign up for Headstart 2.0 — the official 10 KM mini marathon of Excel 2026. Fill in your details, choose your T-shirt size, and secure your spot at Durbar Hall, Ernakulam on 11 October 2026.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/register`,
    title: "Register for Headstart 2.0 | 10K Mini Marathon | Excel 2026",
    description:
      "Secure your bib for Headstart 2.0, the 10 KM mini marathon at Durbar Hall, Ernakulam on 11 Oct 2026. Limited slots available!",
    images: [
      {
        url: "/background.jpg",
        width: 1200,
        height: 630,
        alt: "Headstart 2.0 Registration – Excel 2026 Marathon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Register for Headstart 2.0 | Excel 2026 Marathon",
    description:
      "Secure your bib for the 10 KM mini marathon at Durbar Hall, Ernakulam on 11 Oct 2026!",
    images: ["/background.jpg"],
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
