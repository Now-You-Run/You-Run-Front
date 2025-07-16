// [수정] 분리된 등급 정보를 가져옵니다.
import { UserGrades } from '@/types/Grades';

/**
 * 레벨 계산기: 누적 거리를 기반으로 사용자의 최종 레벨을 계산합니다.
 */
class LevelCalculator {
    private levelDistanceMap = new Map<number, number>();

    constructor() {
        this.initLevelDistanceMap();
    }

    private getDistanceToLevelUp(level: number): number {
        const grade = UserGrades.find(g => level >= g.minLevel && level <= g.maxLevel);
        const distance = grade ? grade.levelMultiple * 1000 : Infinity;
        console.log(`레벨 ${level}의 등급: ${grade?.displayName || '없음'}, 필요 거리: ${distance}m`);
        return distance;
    }

    private initLevelDistanceMap() {
        console.log('🧪 레벨 거리 맵 초기화 시작');
        console.log('UserGrades:', UserGrades);
        
        let cumulativeDistance = 0;
        this.levelDistanceMap.set(1, 0);
        console.log('레벨 1 필요 거리: 0m');
        
        for (let i = 2; i <= 300; i++) {
            const distanceToLevelUp = this.getDistanceToLevelUp(i - 1);
            cumulativeDistance += distanceToLevelUp;
            this.levelDistanceMap.set(i, cumulativeDistance);
            
            // if (i <= 20) { // 처음 20개 레벨만 로그 출력
            //     console.log(`레벨 ${i} 필요 거리: ${cumulativeDistance}m (레벨 ${i-1}에서 ${distanceToLevelUp}m 추가)`);
            // }
        }
        
        // 초기화 확인
        // console.log('🧪 levelDistanceMap 확인:');
        // for (let i = 1; i <= 15; i++) {
        //     const distance = this.levelDistanceMap.get(i);
        //     console.log(`레벨 ${i}: ${distance}m`);
        // }
        console.log('🧪 레벨 거리 맵 초기화 완료');
    }

    public calculateNewLevel(currentTotalDistance: number, newDistance: number): number {
        const newTotalDistance = currentTotalDistance + newDistance;
        console.log('🧪 레벨 계산 디버그:', {
            currentTotalDistance,
            newDistance,
            newTotalDistance
        });
        
        // levelDistanceMap 상태 확인
        console.log('🧪 levelDistanceMap 상태 확인:');
        for (let i = 1; i <= 15; i++) {
            const distance = this.levelDistanceMap.get(i);
            console.log(`레벨 ${i}: ${distance}m`);
        }
        
        let newLevel = 1;
        for (let i = 1; i <= 300; i++) {
            const requiredDistance = this.levelDistanceMap.get(i);
            console.log(`레벨 ${i} 필요 거리: ${requiredDistance}m, 현재 거리: ${newTotalDistance}m`);
            if (requiredDistance === undefined) {
                console.log(`⚠️ 레벨 ${i}의 거리 정보가 없습니다!`);
                break;
            }
            if (newTotalDistance >= requiredDistance) {
                newLevel = i;
            } else {
                break;
            }
        }
        console.log('🧪 최종 레벨:', newLevel);
        return newLevel;
    }
}

/**
 * 포인트 계산기: 달린 거리에 따라 획득 포인트를 계산합니다.
 */
class PointCalculator {
    private static readonly BASE_POINT_PER_100M = 2;
    private static readonly REDUCTION_FACTOR_PER_KM = 0.1;

    public calculatePoint(distanceInMeters: number): number {
        const distancePer100M = distanceInMeters / 100.0;
        const distanceInKm = distanceInMeters / 1000.0;
        let effectivePointRate = PointCalculator.BASE_POINT_PER_100M - (distanceInKm * PointCalculator.REDUCTION_FACTOR_PER_KM);
        if (effectivePointRate < 0) {
            effectivePointRate = 0;
        }
        const calculatedPoints = distancePer100M * effectivePointRate;
        return Math.floor(calculatedPoints);
    }
}

/**
 * 등급 계산기: 레벨에 해당하는 등급 이름을 반환합니다.
 */
class GradeCalculator {
  public getGradeByLevel(level: number): string {
    const grade = UserGrades.find(g => level >= g.minLevel && level <= g.maxLevel);
    // [수정] 서버 데이터와 일치하는 한글 이름(displayName)을 반환합니다.
    return grade ? grade.displayName : '레전드 러너';
  }
}

// 앱 전체에서 사용할 계산 서비스 객체
export const calculationService = {
    level: new LevelCalculator(),
    point: new PointCalculator(),
    grade: new GradeCalculator(),
};
