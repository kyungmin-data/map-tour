'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import type { PlaceData } from '@/lib/actions/places'

// Naver NCP Local Search returns mapx/mapy as WGS84 degrees * 1e7 (integer)
// e.g. "1270289510" → 127.0289510°, "375665350" → 37.5665350°
function toLatLng(mapx: string, mapy: string) {
  return { lat: Number(mapy) / 1e7, lng: Number(mapx) / 1e7 }
}

// Seoul city hall as default center
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }

declare global {
  interface Window {
    naver: any
  }
}

interface MapPin {
  title: string
  mapx: string
  mapy: string
}

export default function NaverMap({
  places,
  selectedPlace,
  previewPlace,
}: {
  places: PlaceData[]
  selectedPlace: PlaceData | null
  previewPlace: MapPin | null
}) {
  const [ready, setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const previewMarkerRef = useRef<any>(null)

  // Create map once, after SDK is loaded.
  // Deferred via requestAnimationFrame so the browser has composited the
  // container before Naver Maps constructs its canvas tile renderer.
  // (useEffect fires before paint; RAF fires at/after paint.)
  useEffect(() => {
    if (!ready) return
    if (!window.naver?.maps) return
    if (!containerRef.current) return
    if (mapRef.current) return

    const container = containerRef.current

    const rafId = requestAnimationFrame(() => {
      if (mapRef.current) return // guard against double-init in StrictMode

      const center = DEFAULT_CENTER
      mapRef.current = new window.naver.maps.Map(container, {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom: 13,
        mapTypeId: window.naver.maps.MapTypeId.NORMAL,
      })
    })

    return () => cancelAnimationFrame(rafId)
  }, [ready])

  // Pan and zoom to a selected place
  useEffect(() => {
    if (!selectedPlace || !mapRef.current || !window.naver?.maps) return
    const { lat, lng } = toLatLng(selectedPlace.mapx, selectedPlace.mapy)
    mapRef.current.panTo(new window.naver.maps.LatLng(lat, lng))
    mapRef.current.setZoom(15)
  }, [selectedPlace])

  // Preview a search result — temporary marker, no DB involvement
  useEffect(() => {
    if (!ready || !mapRef.current || !window.naver?.maps) return

    // Always clear the previous preview marker
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setMap(null)
      previewMarkerRef.current = null
    }

    if (!previewPlace) return

    const { lat, lng } = toLatLng(previewPlace.mapx, previewPlace.mapy)
    previewMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapRef.current,
      title: previewPlace.title,
      icon: {
        content: '<div style="width:16px;height:16px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
        anchor: new window.naver.maps.Point(8, 8),
      },
    })
    mapRef.current.panTo(new window.naver.maps.LatLng(lat, lng))
    mapRef.current.setZoom(15)
  }, [previewPlace, ready])

  // Sync markers whenever places change
  useEffect(() => {
    if (!ready) return
    if (!window.naver?.maps) return
    if (!mapRef.current) return

    // Remove old markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    if (places.length === 0) {
      if (!previewPlace) {
        mapRef.current.setCenter(
          new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
        )
      }
      return
    }

    places.forEach((place) => {
      const { lat, lng } = toLatLng(place.mapx, place.mapy)
      const isSelected = selectedPlace?.mapx === place.mapx && selectedPlace?.mapy === place.mapy

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(lat, lng),
        map: mapRef.current,
        title: place.title,
        icon: {
          content: isSelected
            ? '<div style="width:22px;height:22px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>'
            : '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
          anchor: new window.naver.maps.Point(isSelected ? 11 : 7, isSelected ? 11 : 7),
        },
      })

      markersRef.current.push(marker)
    })

    // Only auto-center when no place is explicitly focused.
    // Skipping when previewPlace is set prevents this effect from
    // overriding a preview pan when both `ready` and `places` change
    // in the same render (e.g. SDK loads after user already clicked a result).
    if (!selectedPlace && !previewPlace) {
      const latest = places[0]
      const { lat, lng } = toLatLng(latest.mapx, latest.mapy)
      mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng))
    }
  }, [places, ready, selectedPlace, previewPlace])

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID}`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div
        id="naver-map"
        ref={containerRef}
        className="w-full h-full bg-gray-100"
      />
    </>
  )

}