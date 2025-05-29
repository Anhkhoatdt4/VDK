// src/dateUtils.js

/**
 * Trả về startOfDay và endOfDay dạng yyyy-MM-ddTHH:mm:ss theo local time
 */
export function getTodayRange() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const startOfDay = `${yyyy}-${mm}-${dd}T00:00:00`;
  const endOfDay = `${yyyy}-${mm}-${dd}T23:59:59`;
  return { startOfDay, endOfDay };
}

/**
 * Chuyển Date về local ISO string (yyyy-MM-ddTHH:mm:ss, không có Z)
 */
export function toLocalISOString(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds())
  );
}
