import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Nexus Welcome Day Quiz App",
  description: "Play cybersecurity quizzes and win points!",
  icons: {
    icon: "/Nexus.png",
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
