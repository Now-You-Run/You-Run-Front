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
        return grade ? grade.levelMultiple * 1000 : Infinity;
    }

    private initLevelDistanceMap() {
        let cumulativeDistance = 0;
        this.levelDistanceMap.set(1, 0);
        for (let i = 2; i <= 300; i++) {
            cumulativeDistance += this.getDistanceToLevelUp(i - 1);
            this.levelDistanceMap.set(i, cumulativeDistance);
        }
    }

    public calculateNewLevel(currentTotalDistance: number, newDistance: number): number {
        const newTotalDistance = currentTotalDistance + newDistance;
        let newLevel = 1;
        for (let i = 1; i <= 300; i++) {
            if (newTotalDistance >= (this.levelDistanceMap.get(i) || Infinity)) {
                newLevel = i;
            } else {
                break;
            }
        }
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
