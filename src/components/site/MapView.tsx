"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { SITE, fullAddress } from "@/lib/site";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50% 50% 50% 0;background:#c8412b;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -38],
});

export default function MapView({ className = "h-80" }: { className?: string }) {
  return (
    <MapContainer center={[SITE.geo.lat, SITE.geo.lng]} zoom={15} scrollWheelZoom={false} className={`${className} z-0 w-full`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[SITE.geo.lat, SITE.geo.lng]} icon={pin}>
        <Popup>
          <strong>{SITE.name}</strong>
          <br />
          {fullAddress}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
