import './globals.css'
import { Inter } from 'next/font/google'
import Header from '@/components/Header'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'DevBlog',
  description: 'A blog for everyone who loves technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.cdnfonts.com/css/somerton-dense"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-none bg-lessDarkBg bg-no-repeat`}>
        <Header />
        <NavBar />
        {children}
      </body>
    </html>
  )
}
