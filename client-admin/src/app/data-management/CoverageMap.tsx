'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function CoverageMap({ mapData }: { mapData: any[] }) {
  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  const center: [number, number] = [3.139, 101.6869];
  return (
    <MapContainer center={center} zoom={11} style={{ height: 250, width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapData.map((point) =>
        point.latitude && point.longitude ? (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude] as [number, number]}
            icon={markerIcon}
          >
            <Popup>
              <div>
                <div className="font-bold">{point.displayName || point.location}</div>
                <div>Active: {point.activeCases}</div>
                <div>Total: {point.totalCases}</div>
                <div>Status: {point.status}</div>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
} 