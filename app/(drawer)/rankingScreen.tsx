// RankingScreen.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";

type RankItem = {
  id: string;
  rank: string;
  level: number;
  name: string;
};
type TimeItem = {
  id: string;
  rank: string;
  name: string;
  time: string;
};
type Item = RankItem | TimeItem;

// 가짜 데이터
const DUMMY_DATA_LEVEL: RankItem[] = [
  { id: "1", rank: "1", level: 287, name: "가롱이" },
  { id: "2", rank: "2", level: 286, name: "다롱이" },
  { id: "3", rank: "3", level: 247, name: "라롱이" },
  { id: "4", rank: "4", level: 200, name: "마롱이" },
  { id: "5", rank: "5", level: 193, name: "바롱이" },
  { id: "6", rank: "6", level: 179, name: "사롱이" },
  { id: "7", rank: "7", level: 152, name: "아롱이" },
];
const DUMMY_DATA_TIME: TimeItem[] = [
  { id: "1", rank: "1", name: "가롱이", time: "00:03:51" },
  { id: "2", rank: "2", name: "다롱이", time: "00:04:05" },
  { id: "3", rank: "3", name: "라롱이", time: "00:04:12" },
  { id: "4", rank: "4", name: "마롱이", time: "00:04:20" },
  { id: "5", rank: "5", name: "바롱이", time: "00:05:11" },
  { id: "6", rank: "6", name: "사롱이", time: "00:05:11" },
];

export default function RankingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"level" | "time">("level");
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [distance, setDistance] = useState<"1" | "3" | "5">("1");

  // DropDownPicker 전용 상태
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodItems, setPeriodItems] = useState([
    { label: "일간", value: "day" as const },
    { label: "주간", value: "week" as const },
    { label: "월간", value: "month" as const },
  ]);
  const [distanceOpen, setDistanceOpen] = useState(false);
  const [distanceItems, setDistanceItems] = useState([
    { label: "1km", value: "1" as const },
    { label: "3km", value: "3" as const },
    { label: "5km", value: "5" as const },
  ]);

  // 내 순위 정보
  const myRankLevel = {
    rank: "457",
    level: 4,
    name: "나롱이",
    distanceRemaining: 45,
    max: 100,
  };
  const myRankTime = {
    rank: "-",
    name: "나롱이",
    time: "00:00:00",
  };

  const data: Item[] = tab === "level" ? DUMMY_DATA_LEVEL : DUMMY_DATA_TIME;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <FlatList<Item>
        data={data}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* 프로필 카드 */}
            <View style={styles.profileCard}>
              <View style={styles.cardText}>
                <Text style={styles.levelText}>Lv.{myRankLevel.level}</Text>
                <Text style={styles.nameText}>{myRankLevel.name}</Text>
                <Text style={styles.subText}>
                  {myRankLevel.distanceRemaining}km 달리면 레벨업!
                </Text>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          (myRankLevel.distanceRemaining / myRankLevel.max) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text>0km</Text>
                  <Text>
                    {myRankLevel.max - myRankLevel.distanceRemaining}km
                  </Text>
                  <Text>{myRankLevel.max}km</Text>
                </View>
              </View>
            </View>

            {/* 탭 */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  tab === "level" && styles.tabSelected,
                ]}
                onPress={() => setTab("level")}
              >
                <Text
                  style={
                    tab === "level" ? styles.tabTextActive : styles.tabText
                  }
                >
                  레벨순
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, tab === "time" && styles.tabSelected]}
                onPress={() => setTab("time")}
              >
                <Text
                  style={tab === "time" ? styles.tabTextActive : styles.tabText}
                >
                  시간순
                </Text>
              </TouchableOpacity>
            </View>

            {/* 시간순일 때만 드롭다운 */}
            {tab === "time" && (
              <View style={styles.dropdownRow}>
                <View style={{ flex: 1, zIndex: 2000 }}>
                  <DropDownPicker
                    open={periodOpen}
                    value={period}
                    items={periodItems}
                    setOpen={setPeriodOpen}
                    setValue={setPeriod}
                    setItems={setPeriodItems}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownMenu}
                    textStyle={styles.dropdownMenuText}
                  />
                </View>
                <View style={{ flex: 1, zIndex: 1000 }}>
                  <DropDownPicker
                    open={distanceOpen}
                    value={distance}
                    items={distanceItems}
                    setOpen={setDistanceOpen}
                    setValue={setDistance}
                    setItems={setDistanceItems}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownMenu}
                    textStyle={styles.dropdownMenuText}
                  />
                </View>
              </View>
            )}

            {/* 내 순위 */}
            <View style={styles.sectionTitleWrapper}>
              <Text style={styles.sectionTitle}>내 순위</Text>
            </View>
            <View style={styles.rankRow}>
              <Text style={styles.rankIndex}>
                {tab === "level" ? myRankLevel.rank : myRankTime.rank}
              </Text>
              <Text style={styles.rankText}>
                {tab === "level"
                  ? `Lv.${myRankLevel.level} ${myRankLevel.name}`
                  : `${myRankTime.name}  ${myRankTime.time}`}
              </Text>
            </View>

            {/* 전체순위 헤더 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>전체순위</Text>
              <Text style={styles.updatedAt}>06.22 15:20 기준!</Text>
            </View>
          </>
        }
        renderItem={({ item }) =>
          "level" in item ? (
            <View style={styles.rankRow}>
              <Text style={styles.rankIndex}>{item.rank}</Text>
              <Text style={styles.rankText}>
                Lv.{item.level} {item.name}
              </Text>
            </View>
          ) : (
            <View style={styles.rankRow}>
              <Text style={styles.rankIndex}>{item.rank}</Text>
              <Text style={styles.rankText}>
                {item.name} {item.time}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileCard: {
    margin: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  cardText: { flex: 1 },
  levelText: { fontSize: 20, fontWeight: "700" },
  nameText: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  subText: { marginTop: 8, color: "#555" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ccc",
  },

  progressBarBackground: {
    height: 8,
    backgroundColor: "#ddd",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
    width: "100%",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#f9d71c",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
    overflow: "visible",
    zIndex: 10,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabSelected: { backgroundColor: "#fff" },
  tabText: { color: "#888", fontWeight: "500" },
  tabTextActive: { color: "#000", fontWeight: "700" },

  dropdownRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    columnGap: 8,
  },
  dropdown: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dropdownMenu: {
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  dropdownMenuText: {
    fontSize: 14,
    color: "#333",
  },

  sectionTitleWrapper: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 24,
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  updatedAt: { fontSize: 12, color: "#666" },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  rankIndex: { fontSize: 18, width: 32, textAlign: "center" },
  rankText: { marginLeft: 8, fontSize: 16 },
});
