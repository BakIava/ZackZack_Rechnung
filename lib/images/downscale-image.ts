/** Längste Kante nach dem Verkleinern – reicht für Handschrift, bleibt deutlich unter 1 MB. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

/**
 * Verkleinert Fotos im Browser vor dem Upload und speichert sie als JPEG.
 * PDFs und nicht dekodierbare Bilder gehen unverändert weiter; der Server
 * prüft Typ und Größe ohnehin selbst.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ?? file;
}
