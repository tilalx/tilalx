import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './globals.css'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { Providers } from './providers'
import Navbar from './Navbar'
import Track from './Track'

export const metadata = {
  title: 'tilalx',
  description: 'Personal Page',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <Providers>
          <Track />
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
