"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { MapClickHandler as MapClickHandlerBase, MapFlyTo as MapFlyToBase } from "./MapEvents"

type LatLng = { lat: number; lng: number }

type MapPickerProps = {
  value?: LatLng | null
  onChange: (coords: LatLng) => void
  height?: number
}

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
// Map click handler must be a component (not a hook) for dynamic()
const MapClickHandler = dynamic(async () => ({ default: MapClickHandlerBase }), { ssr: false })
const MapFlyTo = dynamic(async () => ({ default: MapFlyToBase }), { ssr: false })

// Workaround default marker icon issue in Leaflet + Next
// Only run on client
function useFixDefaultIcon() {
  useEffect(() => {
    let cancelled = false
    async function setup() {
      if (typeof window === 'undefined') return
      try {
        const L = await import('leaflet')
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: markerIcon2x,
          iconUrl: markerIcon,
          shadowUrl: markerShadow,
        })
      } catch {
        // no-op
      }
    }
    setup()
    return () => { cancelled = true }
  }, [])
}

export default function MapPicker({ value, onChange, height = 320 }: MapPickerProps) {
  useFixDefaultIcon()

  const [position, setPosition] = useState<LatLng | null>(value ?? null)
  const [mapInstance, setMapInstance] = useState<any>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setPosition(value ?? null)
  }, [value])

  const center = useMemo<LatLng>(() => {
    if (position) return position
    // Default center (Singapore region)
    return { lat: 1.3521, lng: 103.8198 }
  }, [position])

  // Use separate component to handle map click/zoom

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = `${API_BASE}/geocode/search?q=${encodeURIComponent(searchQuery)}&limit=5`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error('Failed to search location')
      const data = await res.json()
      setSearchResults(data || [])
      setSearchOpen(true)
    } catch {
      setSearchResults([])
      setSearchOpen(false)
    } finally {
      setSearchLoading(false)
    }
  }

  function handleSelectResult(item: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    const coords = { lat, lng }
    setPosition(coords)
    onChange(coords)
    if (mapInstance) {
      mapInstance.setView([lat, lng], 15)
    }
    setSearchOpen(false)
  }

  return (
    <div style={{ height }} className="relative w-full overflow-hidden rounded-lg border border-accent-blue">
      {/* Search overlay */}
      <div className="absolute z-[1000] right-3 top-3 flex flex-col gap-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search place or address..."
            className="w-[300px] rounded-md border border-accent-blue bg-white px-3 py-2 text-sm shadow"
          />
          <button
            type="submit"
            className="rounded-md bg-[#A21C1C] px-3 py-2 text-sm font-semibold text-white shadow hover:bg-[#7C1D1D] disabled:opacity-60"
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {searchOpen && searchResults.length > 0 && (
          <div className="w-[300px] max-h-56 overflow-auto rounded-md border border-accent-blue bg-white shadow">
            {searchResults.map((r, idx) => (
              <button
                key={`${r.lat}-${r.lon}-${idx}`}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-light-bg/50"
                onClick={() => handleSelectResult(r)}
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={center as unknown as [number, number]}
        zoom={position ? 14 : 11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler
          position={position}
          onSelect={(coords) => {
            setPosition(coords)
            onChange(coords)
          }}
        />
        <MapFlyTo position={position} />
        {position && (
          <Marker
            draggable
            position={[position.lat, position.lng]}
            eventHandlers={{
              dragend: (e: unknown) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const marker = e as any
                const ll = marker?.target?.getLatLng?.()
                if (ll) {
                  const coords = { lat: ll.lat, lng: ll.lng }
                  setPosition(coords)
                  onChange(coords)
                }
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}


