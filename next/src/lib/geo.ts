import { doc, getDoc, getDocs, collection, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export type LatLng = { lat: number; lng: number };
export type Geofence = LatLng & { radius: number; label?: string };

export const MAX_RADIUS = 500; // metres — hard cap requested
export const MIN_RADIUS = 50;
export const DEFAULT_RADIUS = 200;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clampRadius(r: number): number {
  if (!Number.isFinite(r)) return DEFAULT_RADIUS;
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(r)));
}

/** A user's assigned check-in geofence (doc id = user uid). */
export async function loadGeofence(uid: string): Promise<Geofence | null> {
  try {
    const snap = await getDoc(doc(db, "nexus_geofences", uid));
    if (!snap.exists()) return null;
    const d = snap.data() as Geofence;
    if (typeof d.lat !== "number" || typeof d.lng !== "number") return null;
    return { lat: d.lat, lng: d.lng, radius: clampRadius(d.radius), label: d.label };
  } catch {
    return null;
  }
}

/** All geofences keyed by uid (for the admin/HR manager view). */
export async function loadAllGeofences(): Promise<Record<string, Geofence>> {
  const out: Record<string, Geofence> = {};
  try {
    const snap = await getDocs(collection(db, "nexus_geofences"));
    snap.docs.forEach((s) => {
      const d = s.data() as Geofence;
      if (typeof d.lat === "number" && typeof d.lng === "number") {
        out[s.id] = { lat: d.lat, lng: d.lng, radius: clampRadius(d.radius), label: d.label };
      }
    });
  } catch {
    /* ignore */
  }
  return out;
}

export async function saveGeofence(uid: string, g: Geofence, setBy?: string): Promise<void> {
  await setDoc(doc(db, "nexus_geofences", uid), {
    lat: g.lat,
    lng: g.lng,
    radius: clampRadius(g.radius),
    label: g.label || "",
    setBy: setBy || "",
    updatedAt: Date.now(),
  });
}

export async function clearGeofence(uid: string): Promise<void> {
  await deleteDoc(doc(db, "nexus_geofences", uid));
}

/** Promise wrapper around the browser geolocation API. */
export function getCurrentPosition(): Promise<LatLng & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — enable location to check in"
              : "Could not get your location — try again outdoors"
          )
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
