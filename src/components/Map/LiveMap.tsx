'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Icons
const originIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', // Origin
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const destIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Destination
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const truckIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface LiveTrackingMapProps {
  lat?: number;
  lng?: number;
  motorista?: string;
  rota?: {
    origem: { lat: number; lng: number; label: string };
    destino: { lat: number; lng: number; label: string };
  };
}

function RecenterMap({ lat, lng, bounds }: { lat?: number, lng?: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (lat && lng) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, bounds, map]);
  return null;
}

export default function LiveMap({ lat, lng, motorista, rota }: LiveTrackingMapProps) {
  const points: [number, number][] = [];
  if (rota) {
    points.push([rota.origem.lat, rota.origem.lng]);
    points.push([rota.destino.lat, rota.destino.lng]);
  }
  
  const center: [number, number] = lat && lng ? [lat, lng] : (rota ? [rota.origem.lat, rota.origem.lng] : [-22.9068, -43.1729]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {rota && (
          <>
            <Marker position={[rota.origem.lat, rota.origem.lng]} icon={originIcon}>
              <Popup><div className="text-xs font-bold">Início: {rota.origem.label}</div></Popup>
            </Marker>
            <Marker position={[rota.destino.lat, rota.destino.lng]} icon={destIcon}>
              <Popup><div className="text-xs font-bold">Fim: {rota.destino.label}</div></Popup>
            </Marker>
            <Polyline positions={points} color="#3b82f6" weight={4} opacity={0.6} dashArray="10, 10" />
            <RecenterMap bounds={points} />
          </>
        )}

        {lat && lng && (
          <Marker position={[lat, lng]} icon={truckIcon}>
            <Popup>
              <div className="text-xs font-bold">
                Motorista: {motorista} <br />
                <span className="text-blue-600">Posição Atual</span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {!rota && lat && lng && <RecenterMap lat={lat} lng={lng} />}
      </MapContainer>
    </div>
  );
}
