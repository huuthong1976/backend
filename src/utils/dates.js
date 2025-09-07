// Chuyển ISO string -> 'YYYY-MM-DD HH:mm:ss' (UTC)
function isoToMysql(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid ISO datetime');
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
module.exports = { isoToMysql };
