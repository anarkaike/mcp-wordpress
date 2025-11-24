export function normalizePhone(input) {
  if (!input) return "";
  const trimmed = String(input).trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits;
}

export function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input).trim());
}