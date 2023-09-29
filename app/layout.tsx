import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GPT music theorist",
  description: "lil GPT action",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <script
          type="text/javascript"
          src="https://js.cdn.cycling74.com/rnbo/1.1.2/rnbo.min.js"
        />
        <script src="/sound.js" type="module" />
      </body>
    </html>
  );
}

// TODO: change RNBO version to new when updating to not have shit instruments
