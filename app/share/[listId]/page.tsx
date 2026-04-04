import { notFound } from 'next/navigation'
import { getPublicList } from '@/lib/actions/places'
import CopyLinkButton from '@/components/share/CopyLinkButton'
import { headers } from 'next/headers'

export default async function SharePage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const data = await getPublicList(listId)

  if (!data) notFound()

  const { list, places } = data

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const shareUrl = `${proto}://${host}/share/${listId}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">장소 목록</p>
            <h1 className="text-lg font-bold text-gray-900 truncate">{list.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{places.length}곳</p>
          </div>
          <CopyLinkButton url={shareUrl} />
        </div>
      </div>

      {/* Place list */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {places.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">저장된 장소가 없어요</p>
        ) : (
          places.map((place, i) => {
            const category = place.categorySubgroup || place.categoryGroup || place.category.split('>')[0].trim()
            return (
              <div
                key={`${place.mapx}-${place.mapy}`}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex gap-3"
              >
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{place.title}</p>
                  {category && (
                    <p className="text-[11px] text-blue-500 mt-0.5">{category}</p>
                  )}
                  {place.memo && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{place.memo}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 pb-8 pt-2 text-center">
        <p className="text-[10px] text-gray-300">map-tour로 만든 장소 목록</p>
      </div>
    </div>
  )
}
