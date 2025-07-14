import { Coordinate } from '@/types/TrackDto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateDirection } from '../../utils/RunningUtils';

interface RunningMapProps {
    path: Coordinate[];
    isActive: boolean;
    initialRegion: Region;
    onAvatarPositionUpdate: (coord: Coordinate, force?: boolean) => void;
    onMapReady?: (mapRef: MapView | null) => void;

    mode?: 'free' | 'bot';
    externalPath?: Coordinate[];
    botPosition?: Coordinate;
    startPosition?: Coordinate;
    endPosition?: Coordinate;
    isSimulating?: boolean;
    onMapPress?: () => void;
    onRegionChange?: (region: Region) => void;
}

export const RunningMap: React.FC<RunningMapProps> = React.memo(({
    path,
    isActive,
    initialRegion,
    onAvatarPositionUpdate,
    onMapReady,
    mode = 'free',
    externalPath,
    botPosition,
    startPosition,
    endPosition,
    isSimulating = false,
    onMapPress,
    onRegionChange,
}) => {
    const mapRef = useRef<MapView>(null);
    const insets = useSafeAreaInsets();
    const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
    const [lastMapHeading, setLastMapHeading] = useState<number>(0);
    const lastUpdateRef = useRef<number>(0);

    // 경로 메모이제이션
    const memoizedPath = useMemo(() => path, [path.length]);

    // 초기 region 설정
    useEffect(() => {
        setCurrentRegion(initialRegion);
        console.log('🗺️ 지도 초기 region 설정:', initialRegion);
    }, [initialRegion]);

    useEffect(() => {
        if (path.length === 0) return;

        const now = Date.now();
        // 업데이트 빈도 제한 (500ms)
        if (now - lastUpdateRef.current < 500) return;
        lastUpdateRef.current = now;

        const current = path[path.length - 1];

        // 지도 중심 이동
        if (path.length > 1) {
            const previous = path[path.length - 2];
            const direction = calculateDirection(previous, current);

            if (direction !== null) {
                const headingDiff = Math.abs(direction - lastMapHeading);
                const shouldRotate = headingDiff > 15 || headingDiff > 345;

                if (shouldRotate) {
                    try {
                        mapRef.current?.animateCamera({
                            center: current,
                            heading: direction,
                        }, { duration: 500 });

                        setLastMapHeading(direction);
                    } catch (error) {
                        console.log('지도 애니메이션 오류:', error);
                    }
                } else {
                    try {
                        mapRef.current?.animateCamera({
                            center: current,
                        }, { duration: 300 });
                    } catch (error) {
                        console.log('지도 중심 이동 오류:', error);
                    }
                }
            }
        } else {
            // 첫 번째 경로 포인트일 때 지도 중심 업데이트
            const newRegion: Region = {
                latitude: current.latitude,
                longitude: current.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setCurrentRegion(newRegion);
        }

        // 아바타 위치 업데이트
        onAvatarPositionUpdate(current);
    }, [path.length, onAvatarPositionUpdate, lastMapHeading]);

    const handleMyLocationPress = useCallback(() => {
        if (path.length === 0) {
            // 경로가 없을 때는 초기 위치로 이동
            mapRef.current?.animateCamera({
                center: {
                    latitude: initialRegion.latitude,
                    longitude: initialRegion.longitude,
                },
                zoom: 16,
            }, { duration: 500 });
            return;
        }

        const lastCoord = path[path.length - 1];
        mapRef.current?.animateCamera({
            center: lastCoord,
            zoom: 16,
        }, { duration: 500 });
        onAvatarPositionUpdate(lastCoord, true);
    }, [path.length, onAvatarPositionUpdate, initialRegion]);

    return (
        <View style={StyleSheet.absoluteFill}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={initialRegion}
                showsUserLocation={false}
                followsUserLocation={false}
                showsMyLocationButton={false}
                rotateEnabled={true}
                pitchEnabled={false}
                zoomEnabled={true}
                scrollEnabled={true}
                onMapReady={() => {
                    console.log('🗺️ 지도 준비 완료');

                    // 부모 컴포넌트에 mapRef 전달
                    if (onMapReady && mapRef.current) {
                        onMapReady(mapRef.current);
                    }

                    // 지도가 준비되면 초기 위치로 이동
                    if (mapRef.current) {
                        setTimeout(() => {
                            mapRef.current?.animateCamera({
                                center: {
                                    latitude: initialRegion.latitude,
                                    longitude: initialRegion.longitude,
                                },
                                zoom: 15,
                            }, { duration: 1000 });
                        }, 100);
                    }
                }}
            >
                {isActive && memoizedPath.length > 0 && (
                    <Polyline
                        coordinates={memoizedPath}
                        strokeColor="#007aff"
                        strokeWidth={6}
                    />
                )}
            </MapView>

            <TouchableOpacity
                style={[
                    styles.myLocationButton,
                    { bottom: 260 + insets.bottom }
                ]}
                onPress={handleMyLocationPress}
            >
                <Image
                    source={require('../../assets/images/MyLocation.png')}
                    style={styles.myLocationIcon}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    myLocationButton: {
        position: 'absolute',
        right: 15,
        backgroundColor: 'rgba(246, 246, 246, 0.5)',
        padding: 10,
        borderRadius: 80,
        zIndex: 1100,
    },
    myLocationIcon: {
        width: 20,
        height: 20,
        tintColor: 'black'
    }
});
