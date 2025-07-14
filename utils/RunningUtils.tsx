// /utils/runningUtils.ts

import { Coordinate } from "@/types/TrackDto";

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

export const calculateTotalDistance = (
  path: Coordinate[]
): number => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(
      path[i - 1].latitude,
      path[i - 1].longitude,
      path[i].latitude,
      path[i].longitude
    );
  }
  return total;
};

export const calculateAveragePace = (km: number, sec: number): string => {
  if (km < 0.01 || sec === 0) return `0'00"`;
  const paceSec = sec / km;
  const m = Math.floor(paceSec / 60);
  const s = Math.round(paceSec % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};
export function paceToKmh(minutes: number, seconds: number): number {
  const totalMinutes = minutes + seconds / 60;
  return totalMinutes === 0 ? 0 : 60 / totalMinutes;
}

export const formatDateTime = (date : Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const calculateDirection = (from: Coordinate, to: Coordinate): number | null => {
  const deltaLng = to.longitude - from.longitude;
  const deltaLat = to.latitude - from.latitude;

  const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
  if (distance < 0.00001) {
    return null;
  }

  let angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
  return angle;
};

export function smoothPath(
  path: Coordinate[],
  windowSize: number = 5
): Coordinate[] {
  if (path.length < windowSize) return path;

  const smoothed: Coordinate[] = [];

  for (let i = 0; i < path.length; i++) {
    let latSum = 0;
    let lonSum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(path.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      latSum += path[j].latitude;
      lonSum += path[j].longitude;
      count++;
    }
    smoothed.push({
      latitude: latSum / count,
      longitude: lonSum / count,
    });
  }

  return smoothed;
}

export function findPositionOnTrack(
  targetCoord: Coordinate, 
  trackPath: Coordinate[]
): { distance: number; closestIndex: number; progress: number } {
  if (!trackPath.length) return { distance: 0, closestIndex: 0, progress: 0 };
  
  let minDistance = Infinity;
  let closestIndex = 0;
  let progressDistance = 0;
  
  // 가장 가까운 트랙 지점 찾기
  for (let i = 0; i < trackPath.length; i++) {
    const distance = haversineDistance(
      targetCoord.latitude, targetCoord.longitude,
      trackPath[i].latitude, trackPath[i].longitude
    ) * 1000; // 미터 단위
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  // 해당 지점까지의 진행 거리 계산
  for (let i = 1; i <= closestIndex; i++) {
    progressDistance += haversineDistance(
      trackPath[i-1].latitude, trackPath[i-1].longitude,
      trackPath[i].latitude, trackPath[i].longitude
    ) * 1000; // 미터 단위
  }
  
  return {
    distance: minDistance,
    closestIndex,
    progress: progressDistance
  };
}

export function calculateTrackDistance(
  botPosition: Coordinate | null,
  userPosition: Coordinate | null,
  trackPath: Coordinate[]
): { distanceMeters: number; isAhead: boolean; botProgress: number; userProgress: number } {
  if (!botPosition || !userPosition || !trackPath.length) {
    return { distanceMeters: 0, isAhead: false, botProgress: 0, userProgress: 0 };
  }
  
  // 봇의 트랙 상 위치 및 진행 거리
  const botOnTrack = findPositionOnTrack(botPosition, trackPath);
  
  // 사용자의 트랙 상 위치 및 진행 거리  
  const userOnTrack = findPositionOnTrack(userPosition, trackPath);
  
  // 트랙 상에서의 진행 거리 차이 계산
  const progressDifference = botOnTrack.progress - userOnTrack.progress;
  
  return {
    distanceMeters: Math.abs(progressDifference),
    isAhead: progressDifference > 0, // 봇이 앞서고 있는지
    botProgress: botOnTrack.progress,
    userProgress: userOnTrack.progress
  };
}