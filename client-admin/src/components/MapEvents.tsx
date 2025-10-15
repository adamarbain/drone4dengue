"use client"

import { useEffect } from "react"
import { useMap, useMapEvents } from "react-leaflet"

type LatLng = { lat: number; lng: number }

export function MapClickHandler({ position, onSelect }: { position: LatLng | null; onSelect: (coords: LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  useEffect(() => {
    if (position) {
      map.setView(position as unknown as import("leaflet").LatLngExpression, Math.max(map.getZoom(), 14))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export function MapFlyTo({ position, zoom = 15 }: { position: LatLng | null; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], zoom)
    }
  }, [map, position, zoom])
  return null
}


