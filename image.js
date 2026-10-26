// Shrinks a photo in the browser and returns it as a JPEG data URL.
// Photos are stored inside the Firestore document, so this keeps each one small
// (a dish photo is roughly 60 to 120 KB) and avoids needing Firebase Storage.
export async function fileToDataUrl(file, max = 800, quality = 0.8) {
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('unsupported');
  }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * k));
  canvas.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  if (bmp.close) bmp.close();
  const url = canvas.toDataURL('image/jpeg', quality);
  if (url.length > 700_000) throw new Error('too-large');
  return url;
}

export function explainImageError(e) {
  if (e && e.message === 'too-large') return 'That photo is still too large after shrinking. Try a smaller one.';
  return 'That image could not be read. Use a JPG, PNG or WebP file.';
}
