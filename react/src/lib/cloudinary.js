const CLOUD = "dlutxjphq";
const PRESET = "nexus_unsigned";
const MAX = 5 * 1024 * 1024;
const ALLOW = { jpg: [[0xff, 0xd8, 0xff]], jpeg: [[0xff, 0xd8, 0xff]], png: [[0x89, 0x50, 0x4e, 0x47]], pdf: [[0x25, 0x50, 0x44, 0x46]] };
const BLOCK = /\.(php|phtml|php5|pht|phar|jsp|asp|aspx|py|sh|exe|bat|cmd|js|html?)$/i;

function magicOK(bytes, sigs) {
  return sigs.some((sig) => sig.every((b, i) => bytes[i] === b));
}

/** Cloudinary unsigned upload → secure_url. */
async function upload(blob, folder) {
  const fd = new FormData();
  fd.append("file", blob);
  fd.append("upload_preset", PRESET);
  if (folder) fd.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, { method: "POST", body: fd });
  const j = await res.json();
  if (!j || !j.secure_url) throw new Error((j && j.error && j.error.message) || "Upload failed");
  return { url: j.secure_url, path: j.public_id };
}

/** Validate (ext + magic bytes + size, block executables) then upload. */
export async function uploadFile(file, folder) {
  if (!file) throw new Error("No file");
  if (file.size > MAX) throw new Error("Max 5MB");
  const nm = (file.name || "").toLowerCase();
  const ext = nm.split(".").pop();
  if (BLOCK.test(nm) || !ALLOW[ext]) throw new Error("Only jpg, png, pdf");
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!magicOK(head, ALLOW[ext])) throw new Error("Content does not match extension");
  return upload(file, folder);
}

/** Upload a generated blob (e.g. signature PNG) — trusted, no magic check. */
export function uploadBlob(blob, folder) {
  return upload(blob, folder);
}
