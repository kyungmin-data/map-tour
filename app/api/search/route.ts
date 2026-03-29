import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')
  if (!query) {
    return Response.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Naver API credentials not configured' }, { status: 500 })
  }

  const url = new URL('https://openapi.naver.com/v1/search/local.json')
  url.searchParams.set('query', query)
  url.searchParams.set('display', '10')
  url.searchParams.set('sort', 'random')

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })
  } catch {
    return Response.json({ error: '검색 서버에 연결할 수 없어요' }, { status: 502 })
  }

  if (!response.ok) {
    return Response.json({ error: 'Naver API request failed' }, { status: response.status })
  }

  try {
    const data = await response.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: '검색 결과를 파싱할 수 없어요' }, { status: 502 })
  }
}
