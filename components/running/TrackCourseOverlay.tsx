import { Coordinate } from '@/types/TrackDto';
import { TRACK_CONSTANTS } from '@/utils/Constants';
import React from 'react';
import { Image } from 'react-native';
import { Circle, Marker, Polyline } from 'react-native-maps';

interface TrackCourseOverlayProps {
  externalPath: Coordinate[];
  userPath: Coordinate[];
  startPosition: Coordinate | null;
  endPosition: Coordinate | null;
  botPosition: Coordinate | null;
  isSimulating: boolean;
}

export const TrackCourseOverlay: React.FC<TrackCourseOverlayProps> = ({
  externalPath,
  userPath,
  startPosition,
  endPosition,
  botPosition,
  isSimulating
}) => {
  return (
    <>
      {/* 설계된 트랙 경로 (점선) */}
      {externalPath.length > 0 && (
        <Polyline
          coordinates={externalPath}
          strokeColor="rgba(255, 0, 0, 0.5)"
          strokeWidth={4}
          lineDashPattern={[5, 5]}
        />
      )}

      {/* 사용자가 실제로 뛴 경로 (실선) */}
      {userPath.length > 0 && (
        <Polyline
          coordinates={userPath}
          strokeColor="#007aff"
          strokeWidth={5}
        />
      )}

      {/* 시작점 마커 */}
      {startPosition && (
        <Marker coordinate={startPosition} title="Start">
          <Image
            source={require('@/assets/images/start-line.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </Marker>
      )}

      {/* 시작 전: 시작 지점 원형 표시 */}
      {!isSimulating && startPosition && (
        <Circle
          center={startPosition}
          radius={TRACK_CONSTANTS.START_RADIUS_METERS}
          strokeColor="rgba(0, 200, 0, 0.7)"
          fillColor="rgba(0, 200, 0, 0.2)"
        />
      )}

      {/* 도착점 마커 */}
      {endPosition && (
        <Marker coordinate={endPosition} title="Finish">
          <Image
            source={require('@/assets/images/finish-line.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </Marker>
      )}

      {/* 러닝 중: 도착 지점 원형 표시 */}
      {isSimulating && endPosition && (
        <Circle
          center={endPosition}
          radius={TRACK_CONSTANTS.FINISH_RADIUS_METERS}
          strokeColor="rgba(255, 0, 0, 0.7)"
          fillColor="rgba(255, 0, 0, 0.2)"
        />
      )}

      {/* 봇 마커 */}
      {botPosition && (
        <Marker coordinate={botPosition} title="Bot" pinColor="red" />
      )}
    </>
  );
};
