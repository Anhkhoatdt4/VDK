// src/utils.js

/**
 * Định dạng timestamp về dạng giờ:phút:giây - ngày/tháng/năm (theo múi giờ local)
 * Hỗ trợ epoch, ISO string, local string.
 */
export function formatTimestamp(ts) {
  if (!ts) return "--";
  let date;
  if (typeof ts === "number") {
    date = new Date(ts);
  } else if (/^\d+$/.test(ts)) {
    date = new Date(Number(ts));
  } else if (typeof ts === "string") {
    if (ts.endsWith && ts.endsWith("Z")) {
      date = new Date(ts);
    } else if (ts.includes("T")) {
      date = new Date(ts);
    } else {
      date = new Date(ts.replace(" ", "T"));
    }
  } else {
    return "--";
  }
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("vi-VN", { hour12: false }) +
    " - " +
    date.toLocaleDateString("vi-VN");
}
