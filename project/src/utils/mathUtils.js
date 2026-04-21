export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const angleDeg = (a, b, c) => {
  const abx = a.x - b.x; const aby = a.y - b.y;
  const cbx = c.x - b.x; const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.hypot(abx, aby); const magCB = Math.hypot(cbx, cby);
  if (magAB === 0 || magCB === 0) return 0;
  return (Math.acos(clamp(dot / (magAB * magCB), -1, 1)) * 180) / Math.PI;
};
