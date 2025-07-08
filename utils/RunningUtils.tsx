// /utils/runningUtils.ts

/** 순간 페이스(1km당 시간)를 계산합니다. */
export const calculateInstantPace = (speedKmh: number): string => {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

/** 초를 mm:ss 형식 문자열로 변환합니다. */
export const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};


export const calculateAveragePace = (km: number, sec: number): string => {
  if (km < 0.01 || sec === 0) return `0'00"`;
  const paceSec = sec / km;
  const m = Math.floor(paceSec / 60);
  const s = Math.round(paceSec % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};