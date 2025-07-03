import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import * as FileSystem from "expo-file-system";

// 레벨 구간별 등급 매핑
const TIER_MAP: { minLevel: number; name: string }[] = [
  { minLevel: 1, name: "Bronze" },
  { minLevel: 5, name: "Silver" },
  { minLevel: 10, name: "Gold" },
  { minLevel: 20, name: "Platinum" },
  { minLevel: 30, name: "Diamond" },
  { minLevel: 40, name: "Master" },
  { minLevel: 50, name: "Grandmaster" },
  { minLevel: 60, name: "Challenger" },
];

// 레벨업 경험치 임계치 (XP 단위: 미터)
const MAX_LEVEL = TIER_MAP[TIER_MAP.length - 1].minLevel;
const LEVEL_XP_THRESHOLDS: number[] = (() => {
  const arr: number[] = [0];
  for (let i = 1; i <= MAX_LEVEL; i++) {
    // 예: 레벨 i 진입에 필요한 XP = 이전 threshold + i * 1000
    arr.push(arr[i - 1] + i * 1000);
  }
  return arr;
})();

export interface UserProfile {
  totalDistance: number;
  xp: number;
  level: number;
  tier: string;
}

const PROFILE_FILE = FileSystem.documentDirectory + "profile.json";

function calculateLevel(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) lvl = i + 1;
    else break;
  }
  return lvl;
}

function calculateTier(level: number): string {
  for (let i = TIER_MAP.length - 1; i >= 0; i--) {
    if (level >= TIER_MAP[i].minLevel) return TIER_MAP[i].name;
  }
  return TIER_MAP[0].name;
}

async function loadProfile(): Promise<UserProfile> {
  try {
    const info = await FileSystem.getInfoAsync(PROFILE_FILE);
    if (info.exists && info.size > 0) {
      const raw = await FileSystem.readAsStringAsync(PROFILE_FILE);
      return JSON.parse(raw) as UserProfile;
    }
  } catch {}
  return { totalDistance: 0, xp: 0, level: 1, tier: "Bronze" };
}

async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    const raw = JSON.stringify(profile);
    await FileSystem.writeAsStringAsync(PROFILE_FILE, raw, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {}
}

export default function LevelCalculation() {
  const initialProfile: UserProfile = {
    totalDistance: 0,
    xp: 0,
    level: 1,
    tier: "Bronze",
  };
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const handleRun = async (runDistance: number) => {
    const newXp = profile.xp + runDistance;
    const newLevel = calculateLevel(newXp);
    const newTier = calculateTier(newLevel);
    const updated: UserProfile = {
      totalDistance: profile.totalDistance + runDistance,
      xp: newXp,
      level: newLevel,
      tier: newTier,
    };
    setProfile(updated);
    await saveProfile(updated);
  };

  const handleReset = async () => {
    setProfile(initialProfile);
    await saveProfile(initialProfile);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.level}>Level {profile.level}</Text>
      <Text style={styles.tier}>Tier: {profile.tier}</Text>
      <Text style={styles.xp}>
        XP: {profile.xp.toLocaleString()} /{" "}
        {LEVEL_XP_THRESHOLDS[profile.level] || "∞"}
      </Text>

      <View style={styles.buttons}>
        <Button title="Add 1km Run" onPress={() => handleRun(1000)} />
        <Button title="Add 5km Run" onPress={() => handleRun(5000)} />
        <Button title="Reset Profile" color="red" onPress={handleReset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  level: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  tier: { fontSize: 18, marginBottom: 8 },
  xp: { fontSize: 14, color: "#555", marginBottom: 20 },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
});
