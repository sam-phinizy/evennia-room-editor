"use client"

import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AttributeSchemaProvider } from '@/hooks/use-attribute-schema'
import { useEffect, useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Prevent hydration errors by not rendering until client-side
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Return a simple loading state until client-side rendering is ready
  if (!mounted) {
    return (
      <html lang="en" className="h-full">
        <head>
          <title>Room Editor</title>
          <meta name="description" content="Visual room/map editor for games" />
        </head>
        <body className={`${inter.className} h-full`}>
          <div className="h-full w-full flex items-center justify-center">
            Loading...
          </div>
        </body>
      </html>
    )
  }
  
  return (
    <html lang="en" className="h-full">
      <head>
        <title>Room Editor</title>
        <meta name="description" content="Visual room/map editor for games" />
      </head>
      <body className={`${inter.className} h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AttributeSchemaProvider>
            {children}
          </AttributeSchemaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
