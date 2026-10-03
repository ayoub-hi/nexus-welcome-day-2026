import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Nexus × Mr. Robot — Welcome Day 2026",
  description: "Hack. Solve. Conquer. The Nexus cybersecurity quiz awaits.",
  icons: {
    icon: "/Nexus.png",
  },
  openGraph: {
    title: "Nexus × Mr. Robot — Welcome Day 2026",
    description: "Hack. Solve. Conquer. The Nexus cybersecurity quiz awaits.",
    images: ["/og-social-image.webp"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
