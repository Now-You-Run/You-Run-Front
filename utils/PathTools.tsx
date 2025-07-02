import type { Coordinate } from '../types/Coordinate';


interface PathTools {
  getCoordinateAt: (distance: number) => Coordinate;
  totalDistance: number;
}

// Haversine 거리 계산 함수 (미터 단위)
const haversineDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// 좌표 보간 함수
const interpolateCoordinate = (
  start: Coordinate, 
  end: Coordinate, 
  fraction: number
): Coordinate => {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * fraction,
    longitude: start.longitude + (end.longitude - start.longitude) * fraction
  };
};

// 경로 도구 생성 함수
export const createPathTools = (coordinates: Coordinate[]): PathTools => {
  // 총 거리 계산 (미터 단위)
  let totalDistance = 0;
  const segmentDistances: number[] = [];
  
  for (let i = 1; i < coordinates.length; i++) {
    const dist = haversineDistance(coordinates[i-1], coordinates[i]);
    segmentDistances.push(dist);
    totalDistance += dist;
  }

  return {
    getCoordinateAt: (distance) => {
      // 거리 기반으로 세그먼트 찾기
      let accumulated = 0;
      for (let i = 0; i < segmentDistances.length; i++) {
        if (distance <= accumulated + segmentDistances[i]) {
          const segmentFraction = (distance - accumulated) / segmentDistances[i];
          return interpolateCoordinate(
            coordinates[i],
            coordinates[i+1],
            segmentFraction
          );
        }
        accumulated += segmentDistances[i];
      }
      return coordinates[coordinates.length - 1];
    },
    totalDistance
  };
};