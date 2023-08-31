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
        <script type="text/javascript" src="https://cdn.cycling74.com/rnbo/latest/rnbo.min.js" />
        <script src="/sound.js" type="module"/>
      </body>
    </html>
  );
}
