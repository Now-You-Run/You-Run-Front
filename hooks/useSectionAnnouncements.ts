// hooks/useSectionAnnouncements.ts
import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';

/** 구간 정보 타입 */
export interface Section {
  name: string;
  endMeters: number; // 해당 구간이 끝나는 누적 거리 (m 단위)
}

export interface Pace {
  minutes: number;
  seconds: number;
}

/**
 * liveMeters       실시간 누적 거리(m)
 * sections         [{ name, endMeters }, …]
 * announceInterval 100m 같은 기본 안내 간격(m)
 */
export function useSectionAnnouncements(
  liveMeters: number,
  sections: Section[],
  announceInterval: number = 100,
  targetPace?: Pace,
  currentPaceSec?: number,
  botDistanceMeters?: number,
) {
    const announcedSectionsRef = useRef(new Set()); // 구간 안내 기록
  const announcedKmRef = useRef(new Set());      // 킬로미터 안내 기록

  useEffect(() => {
    // 러닝 중이 아닐 때는 아무것도 하지 않음
    if (liveMeters === 0) {
      // 러닝이 종료/초기화되면 기록도 초기화
      announcedSectionsRef.current.clear();
      announcedKmRef.current.clear();
      return;
    }

    // 2. 구간(Section) 안내 로직
    sections.forEach(section => {
      // 현재 거리가 구간 목표를 넘었고, 아직 이 구간을 안내한 적이 없다면
      if (liveMeters >= section.endMeters && !announcedSectionsRef.current.has(section.name)) {
        Speech.speak(section.name);
        announcedSectionsRef.current.add(section.name); // 안내했다고 기록
      }
    });

    // 3. 1km 마다 안내하는 로직
    const currentKm = Math.floor(liveMeters / 1000);
    if (currentKm > 0 && !announcedKmRef.current.has(currentKm)) {
      Speech.speak(`${currentKm} 킬로미터를 달렸습니다.`);
      announcedKmRef.current.add(currentKm); // 안내했다고 기록
    }

  }, [liveMeters, sections]); // 의존성 배열은 필요한 데이터로 유지
}
