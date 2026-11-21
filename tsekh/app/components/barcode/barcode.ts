export type BarcodeScanResult = { ok: true; message: string } | { ok: false; title: string; message: string }

// Match the ASCII case-insensitivity of the barcode lookup in SQLite.
export const barcodeKey = (value: string) => value.trim().replace(/[A-Z]/g, char => char.toLowerCase())
