import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Payload docs-update PoC — Next.js + Payload CMS',
  title: 'Payload Docs Update PoC',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
