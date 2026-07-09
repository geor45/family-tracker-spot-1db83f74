import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";

export type MemberLocation = {
  user_id: string;
  display_name: string;
  color: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
};

function makeIcon(color: string, initials: string) {
  const html = `<div style="
    background:${color};
    color:white;
    width:36px;height:36px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,.35);
    border:2px solid white;
    font-weight:600;font-size:13px;font-family:system-ui;
  "><span style="transform:rotate(45deg)">${initials}</span></div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  });
}

export function FamilyMap({ members }: { members: MemberLocation[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [37.9838, 23.7275], // default Athens; will re-fit when data arrives
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const key = useMemo(
    () =>
      members
        .map((m) => `${m.user_id}:${m.latitude.toFixed(5)}:${m.longitude.toFixed(5)}`)
        .join("|"),
    [members],
  );

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (members.length === 0) return;

    const bounds = L.latLngBounds([]);
    for (const m of members) {
      const initials = m.display_name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
      const marker = L.marker([m.latitude, m.longitude], {
        icon: makeIcon(m.color, initials || "?"),
      }).bindPopup(
        `<div style="font-family:system-ui;font-size:13px">
          <strong>${m.display_name}</strong><br/>
          <span style="color:#666">${formatDistanceToNow(new Date(m.updated_at), {
            addSuffix: true,
            locale: el,
          })}</span>
          ${m.accuracy ? `<br/><span style="color:#999">±${Math.round(m.accuracy)}m</span>` : ""}
        </div>`,
      );
      marker.addTo(layer);
      bounds.extend([m.latitude, m.longitude]);
    }
    if (members.length === 1) {
      map.setView([members[0].latitude, members[0].longitude], 15);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={containerRef} className="h-full w-full" />;
}
