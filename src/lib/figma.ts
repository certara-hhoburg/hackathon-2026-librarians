/**
 * Build a Figma embed iframe URL from a share/file/proto/design link.
 * Returns null if the URL is not a trusted figma.com link.
 */
export function toFigmaEmbedSrc(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim())
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'figma.com') return null

    // Already an embed URL
    if (parsed.pathname.startsWith('/embed')) {
      return parsed.toString()
    }

    const embed = new URL('https://www.figma.com/embed')
    embed.searchParams.set('embed_host', 'share')
    embed.searchParams.set('url', parsed.toString())
    return embed.toString()
  } catch {
    return null
  }
}
