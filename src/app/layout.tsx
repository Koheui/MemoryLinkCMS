import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { SecretKeyAuthProvider } from '@/contexts/secret-key-auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CMS',
  description: 'NFC/QRコードで閲覧できる想い出ページを管理するCMSシステム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <QueryProvider>
          <SecretKeyAuthProvider>
            {children}
          </SecretKeyAuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
