import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://cleaver.sinhaankur.com"),
  title: "Star Cleaver — a 3D defender by Ankur Sinha",
  description:
    "An autonomous weapon. Seven worlds. Wave after wave. Hold the line. A 3D R3F defender game — side project by Ankur Sinha.",
  authors: [{ name: "Ankur Sinha", url: "https://www.sinhaankur.com" }],
  creator: "Ankur Sinha",
  openGraph: {
    type: "website",
    url: "https://cleaver.sinhaankur.com",
    title: "Star Cleaver",
    description:
      "An autonomous weapon. Seven worlds. Wave after wave. Hold the line.",
    siteName: "Star Cleaver",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
