/** Great-circle distance in METRES (Haversine). */
export function haversine(la1, lo1, la2, lo2) {
  const R = 6371000;
  const r = (d) => (d * Math.PI) / 180;
  const dLa = r(la2 - la1), dLo = r(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Promise wrapper for the Geolocation API. */
export function getPosition() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("This device has no GPS support"));
    navigator.geolocation.getCurrentPosition(
      (p) => res(p.coords),
      (e) => rej(new Error(e.message || "Location unavailable")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export const hhmm = (ms) => (ms ? new Date(ms).toTimeString().slice(0, 5) : "—");
export const today = () => new Date().toISOString().slice(0, 10);
