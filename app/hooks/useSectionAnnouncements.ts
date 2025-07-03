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
) {
  // 마지막 안내된 구간/거리 기억
  const lastSectionIndexRef = useRef<number>(-1);
  const lastBasicCountRef = useRef<number>(0);

   useEffect(() => {
    sections.forEach((sec, idx) => {
      if (idx > lastSectionIndexRef.current && liveMeters >= sec.endMeters) {
        if (targetPace && currentPaceSec != null) {
          const targetSec = targetPace.minutes * 60 + targetPace.seconds;
          const advise =
            currentPaceSec > targetSec
              ? '속도를 올려주세요.'
              : '속도를 낮춰주세요.';
          Speech.speak(
            `${sec.name}입니다. 목표 페이스는 ` +
            `${targetPace.minutes}분 ${targetPace.seconds}초입니다. ` +
            advise
          );
        } else {
          Speech.speak(`${sec.name}입니다. 페이스를 확인하세요.`);
        }
        lastSectionIndexRef.current = idx;
      }
    });

    // 기본 100m 안내
    const count = Math.floor(liveMeters / announceInterval);
    if (count > lastBasicCountRef.current) {
      Speech.speak(`${count * announceInterval}미터 지점입니다.`);
      lastBasicCountRef.current = count;
    }
  }, [liveMeters, sections, announceInterval, targetPace, currentPaceSec]);
}
