import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Suppress TypeScript error for side-effect CSS import in Next.js app directory
// @ts-ignore: CSS modules or global CSS do not have type declarations
import "./global.css";
import Navbar from "../Component/navbar";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AILink",
  description: "Welcome to AILink",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
        
        
      </body>
        
    </html>
  );
}
