import config from '@/payload.config'
import {
  AskProviderError,
  buildAskMessages,
  callAskModel,
  checkAskRateLimit,
  clientKeyFromRequest,
  excerptFromPost,
  rankPostsForAsk,
  validateAskQuery,
} from '@/lib/ask'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AskBody = {
  question?: unknown
}

export async function POST(req: Request) {
  const rate = checkAskRateLimit(clientKeyFromRequest(req))
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many questions. Please wait a moment and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSec) },
      },
    )
  }

  let body: AskBody
  try {
    body = (await req.json()) as AskBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const validated = validateAskQuery(body.question)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status })
  }

  try {
    const payload = await getPayload({ config: await config })
    const { docs } = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      depth: 1,
      limit: 200,
      sort: '-updatedAt',
    })

    const prepared = docs.map((post) => {
      const categoryName =
        post.category && typeof post.category === 'object' ? post.category.name : null
      const contentText = excerptFromPost(post)
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        categoryName,
        contentText,
      }
    })

    const sources = rankPostsForAsk(validated.query, prepared)
    const messages = buildAskMessages(validated.query, sources)
    const answer = await callAskModel(messages)

    return NextResponse.json({
      answer: answer || 'No answer was generated.',
      sources: sources.map((s) => ({
        title: s.title,
        slug: s.slug,
        summary: s.summary,
        categoryName: s.categoryName,
      })),
    })
  } catch (err) {
    if (err instanceof AskProviderError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    console.error('Ask failed:', err)
    return NextResponse.json(
      {
        error:
          'Could not load library content for Ask. Check DATABASE_URI and that the app can reach Postgres.',
        code: 'library_error',
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST with a JSON body: { "question": "..." }' }, { status: 405 })
}
