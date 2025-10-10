import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Hack Club Cockpit',
  description: 'If you don\'t get it now, you will get it never',
  keywords: ['hackathon', 'event management', 'organizer', 'developer events', 'tech community'],
  authors: [{ name: 'Hack Club' }],
  openGraph: {
    title: 'Hack Club Cockpit',
    description: 'If you don\'t get it now, you will get it never',
    url: 'https://daydream-portal.com',
    siteName: 'Hack Club Cockpit',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Hack Club Cockpit',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hack Club Cockpit',
    description: 'If you don\'t get it now, you will get it never',
    images: ['/android-chrome-512x512.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
