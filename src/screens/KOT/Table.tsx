import React, { useState } from "react";
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
} from "react-native";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "react-native-vector-icons/Ionicons";
import Icon from "react-native-vector-icons/Feather";
import LinearGradient from "react-native-linear-gradient";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootState } from "../../store/store";
import Header from "../../components/Header";
import { FONT_FAMILY } from "../../util/colors";
import { javascriptGet, javascriptGetLocal } from "../../util/api";
import { AppStackParamList } from "../../navigation/AppDrawer";

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

type Props=NativeStackScreenProps<AppStackParamList,'Tables'>
const Table :React.FC<Props> = ({ navigation }) => {
  const queryClient = useQueryClient();
  const [showColors, setShowColors] = useState(false);

  const { token = null, user   } = useSelector(
    (state:RootState) => state.auth
  );

  // ✅ Cached data from HomeMenues query
  const cachedHomeMenues = queryClient.getQueryData([
    "HomeMenues",
    token,
    user.LocationCode,
  ]);

  const colors = [
    { title: "Available", color: "#3b5998" },
    { title: "Occupied", color: "#ffcc00" },
  ];

  // ✅ Fetch table data
  const Tables = useQuery({
    queryKey: ["Tables", token, user.LocationCode],
    queryFn: async () => {
      try {
        const apiObject = {
          path: `staff/tables?locationCode=${user.LocationCode}`,
          body: {},
          Token: token,
        };
        return await javascriptGetLocal(apiObject);
      } catch (error) {
        console.log(error, "error while fetching tables");
        return false;
      }
    },
  });
  // ✅ Validate and navigate to TableOrder screen
  const validateTable = async (Code, MemberProfileID, BillStatus) => {
   
    const response = await javascriptGetLocal({
      Token: token,
      path: `staff/validate/table?location=${user.LocationCode}&table=${Code}`,
    });
    console.log( response, '---------------------- response ---ddddd-----------------');
    if (response?.status === true) {
      navigation.navigate("TableOrder", {
        tableData: response?.table,
        fromQR: false,
        group: response.groups,
        bill: response?.bill,
      });
    } else {
      alert(response?.message || "Invalid Table");
    }
  };
  // 🔹 Shimmer: Location Info
  const renderShimmerLocation = () => (
    <View style={styles.locationCardWrap}>
      <ShimmerPlaceholder style={{ width: "60%", height: 18, borderRadius: 6, alignSelf: "center", marginBottom: 10 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {[...Array(3)].map((_, i) => (
          <ShimmerPlaceholder
            key={i}
            style={{ width: "28%", height: 20, borderRadius: 6 }}
          />
        ))}
      </View>
    </View>
  );

  // 🔹 Shimmer: Table Grid
  const renderShimmerTables = () => (
    <FlatList
      data={[...Array(12)]}
      numColumns={4}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={(_, index) => (
        <ShimmerPlaceholder
          key={index}
          style={{
            width: 80,
            height: 80,
            margin: 5,
            borderRadius: 10,
          }}
        />
      )}
    />
  );
console.log( Tables?.data?.data, '---------------------- Tables?.data?.data ---------------------');
  return (
    <View style={styles.container}>
      <Header toHome={false} title="Tables">
        <Pressable
          style={styles.headerInfoButton}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowColors(!showColors);
          }}
        >
          <Icon name="info" size={20} color="white" />
        </Pressable>
      </Header>

      {/* 🔹 Color Legend */}
      {showColors && (
        <View style={styles.colorsContainer}>
          {colors.map((i, index) => (
            <View key={index} style={styles.colorItem}>
              <View style={[styles.colorBox, { backgroundColor: i.color }]} />
              <Text style={styles.colorText}>{i.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 🔹 Location Info */}
      {Tables.isLoading ? (
        renderShimmerLocation()
      ) : (
        <View style={styles.locationCardWrap}>
          <Text style={styles.locationTitle}>
            {cachedHomeMenues?.locations.find(
              (i) => i.code == user.LocationCode
            )?.LocationName || "N/A"}
          </Text>

          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              Total:{" "}
              <Text style={[styles.statValue, { color: "green" }]}>
                {Tables?.data?.data?.length || 0}
              </Text>
            </Text>
            <Text style={styles.statsText}>
              Running:{" "}
              <Text style={[styles.statValue, { color: "red" }]}>
                {Tables?.data?.data?.filter((i) => i.BillStatus == 0).length || 0}
              </Text>
            </Text>
            <Text style={styles.statsText}>
              Available:{" "}
              <Text style={[styles.statValue, { color: "orange" }]}>
                {Tables?.data?.data?.filter((i) => i.BillStatus == 1).length || 0}
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* 🔹 Table Grid */}
      {Tables.isLoading
        ? renderShimmerTables()
        : (
          <FlatList
            data={Tables?.data?.data || []}
            numColumns={4}
            scrollEnabled
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: i, index }) => (
              <Pressable
                key={index}
                onPress={() =>
                  validateTable(i.TableCode, i.MemberProfileID, i.BillStatus)
                }
                style={[
                  styles.tableItem,
                  i.MemberProfileID ?   styles.occupiedBg:styles.availableBg,
                ]}
              >
                <Ionicons
                  name={i.BillStatus ? "fast-food-outline" : "restaurant-outline"}
                  size={20}
                  color={ i.MemberProfileID  ?  "red":"lightgrey" }
                />
                <Text
                  style={[
                    styles.tableNumber,
                    { color:  i.MemberProfileID ?   "black":"white" },
                  ]}
                >
                  {i.TableNo}
                </Text>
                <Text
                  style={[
                    styles.tableMember,
                    {
                      color: i.MemberProfileID ? "#1e1b1b" : "#85EFAD",
                       
                      fontSize: 10,
                    },
                  ]}
                >
                  {i.MemberProfileID ?'Occupied': "Available"}
                </Text>
              </Pressable>
            )}
          />
        )}
    </View>
  );
};

export default Table;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#f0f0f0'
  },
  headerInfoButton: {
    alignSelf: "flex-end",
  },
  colorsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#f0f0f0",
  },
  colorItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  colorBox: {
    width: 12,
    height: 12,
    marginRight: 6,
    borderRadius: 1,
  },
  colorText: {
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    fontSize: 12,
  },
  locationCardWrap: {
    backgroundColor: "white",
    margin: 10,
    // padding: 10,
    borderRadius: 4,
    elevation:2,
    opacity:0.9
  },
  locationTitle: {
    color: "#884f4fff",
    paddingTop:10,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 25,
    textAlign: "center",
    

  },
  statsRow: {
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "white",
    padding: 4,
    marginTop: 10,
     padding: 10,
    borderRadius: 2,
    borderTopWidth:1,
    borderColor:'#cccccc'
  },
  statsText: {
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    fontSize: 15,
  },
  statValue: {
    fontFamily: FONT_FAMILY.bold,
  },
  columnWrapper: {
    marginVertical: 5,
    justifyContent: "flex-start",
  },
  listContent: {
    flexGrow: 1,
    alignSelf: "center",
    paddingBottom: 100,
  },
  tableItem: {
    width: 80,
    height: 80,
    margin: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  availableBg: {
    backgroundColor: "#3b5998",
  },
  occupiedBg: {
    backgroundColor: "#ffcc00",
  },
  tableNumber: {
    fontFamily: FONT_FAMILY.bold,
  },
  tableMember: {
    fontFamily: FONT_FAMILY.light,
  },
});

// import React, { useState } from "react";
// import {
//   LayoutAnimation,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
//   FlatList,
// } from "react-native";
// import { useSelector } from "react-redux";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import Icon from "react-native-vector-icons/Feather";
// import Header from "../components/Header";
// import { javascriptGet } from "../util/api";
// import { FONT_FAMILY } from "../util/constant";

// const Table = ({ navigation }) => {
//   const queryClient = useQueryClient();
//   const [showColors, setShowColors] = useState(false);

//   const { token = null, data = [] } = useSelector(
//     (state) => state.auth?.userData?.data
//   );

//   // ✅ Cached data from HomeMenues query
//   const cachedHomeMenues = queryClient.getQueryData([
//     "HomeMenues",
//     token,
//     user.LocationCode,
//   ]);

//   const colors = [
//     { title: "Available", color: "#3b5998" },
//     { title: "Occupied", color: "#ffcc00" },
//   ];

//   // ✅ Fetch table data
//   const Tables = useQuery({
//     queryKey: ["Tables", token, user.LocationCode],
//     queryFn: async () => {
//       try {
//         const apiObject = {
//           path: `staff/tables?locationCode=${user.LocationCode}`,
//           body: {},
//           Token: token,
//         };
//         return await javascriptGet(apiObject);
//       } catch (error) {
//         console.log(error, "error while fetching tables");
//         return false;
//       }
//     },
//   });
//   // ✅ Validate and navigate to TableOrder screen
//   const validateTable = async (Code, MemberProfileID, BillStatus) => {
//     const response = await javascriptGet({
//       Token: token,
//       path: `validate/table-qr?location=${user.LocationCode}&table=${Code}`,
//     });
//     if (response?.status === true) {
//       navigation.navigate("TableOrder", {
//         tableData: response?.table,
//         fromQR: false,
//         group: response.groups,
//         bill: response?.bill,
//       });
//     } else {
//       alert(response?.message || "Invalid QR Code");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Header title="Tables">
//         <Pressable
//           style={styles.headerInfoButton}
//           onPress={() => {
//             LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//             setShowColors(!showColors);
//           }}
//         >
//           <Icon name="info" size={20} color="white" />
//         </Pressable>
//       </Header>

//       {/* ✅ Color Legend */}
//       {showColors && (
//         <View style={styles.colorsContainer}>
//           {colors.map((i, index) => (
//             <View key={index} style={styles.colorItem}>
//               <View style={[styles.colorBox, { backgroundColor: i.color }]} />
//               <Text style={styles.colorText}>{i.title}</Text>
//             </View>
//           ))}
//         </View>
//       )}

//       {/* ✅ Location Info */}
//       <View style={styles.locationCardWrap}>
//         <Text style={styles.locationTitle}>
//           {cachedHomeMenues?.locations.find(
//             (i) => i.code == user.LocationCode
//           )?.LocationName || "N/A"}
//         </Text>

//         <View style={styles.statsRow}>
//           <Text style={styles.statsText}>
//             Total:{" "}
//             <Text style={[styles.statValue, { color: "green" }]}>
//               {Tables?.data?.data.length || 0}
//             </Text>
//           </Text>
//           <Text style={styles.statsText}>
//             Running:{" "}
//             <Text style={[styles.statValue, { color: "red" }]}>
//               {Tables?.data?.data.filter((i) => i.BillStatus == 0).length || 0}
//             </Text>
//           </Text>
//           <Text style={styles.statsText}>
//             Available:{" "}
//             <Text style={[styles.statValue, { color: "orange" }]}>
//               {Tables?.data?.data.filter((i) => i.BillStatus == 1).length || 0}
//             </Text>
//           </Text>
//         </View>
//       </View>

//       {/* ✅ Table Grid */}
//       <FlatList
//         data={Tables?.data?.data || []}
//         numColumns={4}
//         scrollEnabled
//         columnWrapperStyle={styles.columnWrapper}
//         contentContainerStyle={styles.listContent}
//         renderItem={({ item: i, index }) => (
//           <Pressable
//             key={index}
//             onPress={() => validateTable(i.TableCode, i.MemberProfileID, i.BillStatus)}
//             style={[
//               styles.tableItem,
//               i.BillStatus ? styles.availableBg : styles.occupiedBg,
//             ]}
//           >
//             <Ionicons
//               name={i.BillStatus ? "fast-food-outline" : "restaurant-outline"}
//               size={20}
//               color={i.BillStatus ? "lightgrey" : "red"}
//             />
//             <Text
//               style={[
//                 styles.tableNumber,
//                 { color: i.BillStatus ? "white" : "black" },
//               ]}
//             >
//               {i.TableNo}
//             </Text>
//             <Text
//               style={[
//                 styles.tableMember,
//                 {
//                   color: i.MemberProfileID ? "#977c7cff" : "lightgreen",
//                   fontSize: i.MemberProfileID ? 15 : 10,
//                 },
//               ]}
//             >
//               {i.MemberProfileID || "Available"}
//             </Text>
//           </Pressable>
//         )}
//       />
//     </View>
//   );
// };

// export default Table;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   headerInfoButton: {
//     alignSelf: "flex-end",
//   },
//   colorsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-around",
//     padding: 10,
//     backgroundColor: "#f0f0f0",
//   },
//   colorItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 4,
//   },
//   colorBox: {
//     width: 12,
//     height: 12,
//     marginRight: 6,
//     borderRadius: 1,
//   },
//   colorText: {
//     color: "black",
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 12,
//   },
//   locationCardWrap: {
//     backgroundColor: "#f0f0f0",
//     margin: 10,
//     padding: 10,
//     borderRadius: 4,
//   },
//   locationTitle: {
//     color: "#977c7cff",
//     fontFamily: FONT_FAMILY.bold,
//     fontSize: 15,
//     textAlign: "center",
//   },
//   statsRow: {
//     justifyContent: "space-between",
//     flexDirection: "row",
//     backgroundColor: "white",
//     padding: 4,
//     marginTop: 10,
//     borderRadius: 2,
//   },
//   statsText: {
//     color: "black",
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 15,
//   },
//   statValue: {
//     fontFamily: FONT_FAMILY.bold,
//   },
//   columnWrapper: {
//     marginVertical: 5,
//     justifyContent: "flex-start",
//   },
//   listContent: {
//     flexGrow: 1,
//     alignSelf: "center",
//     paddingBottom: 100,
//   },
//   tableItem: {
//     width: 80,
//     height: 80,
//     margin: 5,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   availableBg: {
//     backgroundColor: "#3b5998",
//   },
//   occupiedBg: {
//     backgroundColor: "#ffcc00",
//   },
//   tableNumber: {
//     fontFamily: FONT_FAMILY.bold,
//   },
//   tableMember: {
//     fontFamily: FONT_FAMILY.light,
//   },
// });
