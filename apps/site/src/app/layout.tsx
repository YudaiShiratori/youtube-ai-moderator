import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube AI Moderator - YouTubeコメントを自動でフィルタリング',
  description: 'AIを使ってYouTubeのコメントを自動的に検出・フィルタリングするブラウザ拡張機能。スパム、暴言、ネタバレなどを効果的にブロック。',
  keywords: 'YouTube, コメント, フィルター, AI, モデレーター, ブラウザ拡張',
  openGraph: {
    title: 'YouTube AI Moderator',
    description: 'YouTubeコメントを自動でフィルタリング',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'YouTube AI Moderator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube AI Moderator',
    description: 'YouTubeコメントを自動でフィルタリング',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}