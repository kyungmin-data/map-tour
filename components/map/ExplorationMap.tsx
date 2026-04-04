'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import type { RegionData } from '@/lib/utils/regions'
import { CATEGORY_COLORS, isKoreanCoord } from '@/lib/utils/regions'

declare global {
  interface Window { naver: any }
}

function bubbleRadius(count: number) {
  return 350 + 200 * Math.sqrt(count)
}

export default function ExplorationMap({ regions }: { regions: RegionData[] }) {
  const [sdkReady, setSdkReady]     = useState(false)
  const [mapMounted, setMapMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const overlaysRef  = useRef<any[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.naver?.maps) setSdkReady(true)
  }, [])

  useEffect(() => {
    if (!sdkReady || !containerRef.current || mapRef.current) return
    const container = containerRef.current
    requestAnimationFrame(() => {
      if (mapRef.current) return
      mapRef.current = new window.naver.maps.Map(container, {
        center: new window.naver.maps.LatLng(37.5665, 126.9780),
        zoom: 12,
        mapTypeId: window.naver.maps.MapTypeId.NORMAL,
      })
      setMapMounted(true)
    })
  }, [sdkReady])

  useEffect(() => {
    if (!mapMounted || !mapRef.current || !window.naver?.maps) return

    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []

    if (regions.length === 0) return

    let bounds: any = null

    regions.forEach(region => {
      if (!isKoreanCoord(region.lat, region.lng)) {
        console.warn('[exploration] skipped invalid region:', region.name, { lat: region.lat, lng: region.lng })
        return
      }
      console.log('[exploration] drawing region:', region.name, { lat: region.lat, lng: region.lng, count: region.count })

      const pos    = new window.naver.maps.LatLng(region.lat, region.lng)
      const colors = CATEGORY_COLORS[region.dominantCategory] ?? CATEGORY_COLORS['기타']

      if (!bounds) bounds = new window.naver.maps.LatLngBounds(pos, pos)
      else bounds.extend(pos)

      const circle = new window.naver.maps.Circle({
        map:           mapRef.current,
        center:        pos,
        radius:        bubbleRadius(region.count),
        fillColor:     colors.fill,
        fillOpacity:   0.45,
        strokeColor:   colors.stroke,
        strokeWeight:  2,
        strokeOpacity: 0.85,
      })

      const label = new window.naver.maps.Marker({
        position: pos,
        map:      mapRef.current,
        icon: {
          content: `<div style="
            transform:translate(-50%,-50%);
            background:rgba(255,255,255,0.92);
            border-radius:8px;
            padding:4px 8px;
            font-family:'Helvetica Neue',Arial,sans-serif;
            box-shadow:0 1px 6px rgba(0,0,0,0.15);
            text-align:center;
            pointer-events:none;
            white-space:nowrap;
          ">
            <div style="font-size:11px;font-weight:700;color:#18181b">${region.name}</div>
            <div style="font-size:10px;color:${colors.stroke};margin-top:1px">${region.count}곳</div>
          </div>`,
          anchor: new window.naver.maps.Point(0, 0),
        },
      })

      overlaysRef.current.push(circle, label)
    })

    if (bounds) mapRef.current.fitBounds(bounds, { top: 80, right: 60, bottom: 60, left: 60 })
  }, [regions, mapMounted])

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID}`}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="w-full h-full bg-gray-100" />
    </>
  )
}
