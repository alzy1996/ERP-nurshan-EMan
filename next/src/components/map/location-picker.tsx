"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LMap, Marker as LMarker, Circle as LCircle } from "leaflet";

import type { LatLng } from "@/lib/geo";

// Muscat as a sensible default centre when nothing is set yet.
const DEFAULT_CENTER: LatLng = { lat: 23.588, lng: 58.3829 };

/**
 * A Leaflet + OpenStreetMap picker. Click or drag the pin to set the centre;
 * the circle shows the check-in radius. No API key required.
 */
export function LocationPicker({
  value,
  radius,
  onChange,
}: {
  value: LatLng | null;
  radius: number;
  onChange: (v: LatLng) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const circleRef = useRef<LCircle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Initialise the map once (client-only — Leaflet touches window).
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      const start = value || DEFAULT_CENTER;
      const map = L.map(elRef.current, { center: [start.lat, start.lng], zoom: 15 });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "geo-pin",
        html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#6b8aff;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);transform:rotate(-45deg)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
      const circle = L.circle([start.lat, start.lng], {
        radius,
        color: "#6b8aff",
        weight: 1,
        fillColor: "#6b8aff",
        fillOpacity: 0.15,
      }).addTo(map);
      markerRef.current = marker;
      circleRef.current = circle;

      const move = (ll: LatLng) => {
        marker.setLatLng(ll);
        circle.setLatLng(ll);
        onChangeRef.current(ll);
      };
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        move({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e) => move({ lat: e.latlng.lat, lng: e.latlng.lng }));

      // Container is often hidden (inside a Sheet) on first paint.
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the circle radius in sync with the slider.
  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  // Move the pin when the value changes externally (e.g. "use my location");
  // only recentre if the new point is off-screen so map clicks don't jump.
  useEffect(() => {
    if (!value) return;
    markerRef.current?.setLatLng(value);
    circleRef.current?.setLatLng(value);
    const map = mapRef.current;
    if (map && !map.getBounds().contains([value.lat, value.lng])) {
      map.setView([value.lat, value.lng], map.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  return <div ref={elRef} className="h-72 w-full overflow-hidden rounded-2xl border border-border/50" />;
}
