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

type FamilyMapProps = {
  members: MemberLocation[];
  onWakeMember?: (member: MemberLocation) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

export function FamilyMap({ members, onWakeMember }: FamilyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const wakeHandlerRef = useRef(onWakeMember);
  const membersRef = useRef(members);

  useEffect(() => {
    wakeHandlerRef.current = onWakeMember;
  }, [onWakeMember]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [37.9838, 23.7275], // default Athens; will re-fit when data arrives
      zoom: 12,
      maxZoom: 19,
      minZoom: 3,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxNativeZoom: 19,
      maxZoom: 19,
      detectRetina: false,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handlePopupClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
        "[data-wake-user-id]",
      );
      if (!button) return;
      const member = membersRef.current.find((m) => m.user_id === button.dataset.wakeUserId);
      if (member) wakeHandlerRef.current?.(member);
    };
    containerRef.current.addEventListener("click", handlePopupClick);

    return () => {
      containerRef.current?.removeEventListener("click", handlePopupClick);
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
          <strong>${escapeHtml(m.display_name)}</strong><br/>
          <span style="color:#666">${formatDistanceToNow(new Date(m.updated_at), {
            addSuffix: true,
            locale: el,
          })}</span>
          ${m.accuracy ? `<br/><span style="color:#999">±${Math.round(m.accuracy)}m</span>` : ""}
          <button type="button" data-wake-user-id="${escapeHtml(m.user_id)}" style="
            display:flex;align-items:center;justify-content:center;gap:6px;
            width:100%;margin-top:10px;padding:8px 10px;border:0;border-radius:8px;
            background:#111827;color:white;font-weight:700;font-size:12px;font-family:system-ui;
          ">🔔 Ξύπνα βλάκα</button>
        </div>`,
      );
      marker.addTo(layer);
      bounds.extend([m.latitude, m.longitude]);
    }
    if (members.length === 1) {
      map.setView([members[0].latitude, members[0].longitude], 15);
    } else {
      map.fitBounds(bounds.pad(0.2), {
       maxZoom: 17,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, members]);

  return <div ref={containerRef} className="h-full w-full" />;
}
