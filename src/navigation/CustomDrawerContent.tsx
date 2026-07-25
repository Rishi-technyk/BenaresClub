import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Linking,
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Avatar, Drawer } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { loginSuccess, logout } from "../store/slices/authSlice";
import { FONT_FAMILY } from "../util/colors";
import { javascriptGet } from "../util/api";
import { DOMAIN } from "../util/constant";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDrawerConfig } from "../config/dashboardConfig";
import { useAppTheme } from "../theme/AppThemeProvider";

export const CustomDrawerContent = (
  props: DrawerContentComponentProps
) => {
  const dispatch = useDispatch();
  const { colors, resolvedMode, toggleMode } = useAppTheme();
  const user=useSelector((state:any)=>state.auth.user)
  const token=useSelector((state:any)=>state.auth.token)

  const [Menues, setMenues] = useState<any[] | null>(null);

  /* -----------------------------------------
     Fetch Document URLs
  ----------------------------------------- */
  const fetchDrawerMenues = async () => {
    try {
     const config = await getDrawerConfig()
   setMenues(config.drawer_menu)
    } catch (err) {
      console.log(err, "Error fetching documents");
      Alert.alert("Something went wrong while loading data.");
    }
  };

  const loadProfileImage = useCallback(async () => {
    
    try {
     const res= await javascriptGet({path:'member/profile',Token: token});

      if(res.status){
       if(res?.data?.profile_image !== user?.profile_image){
       
         const data=await AsyncStorage.getItem('user');
            
                if (data) {
                  const userData = JSON.parse(data);
                 userData.user.profile_image = res?.data?.profile_image;
               
                  AsyncStorage.setItem('user', JSON.stringify(userData));
                  dispatch(loginSuccess(userData))
                }
              }
      }
    } catch (error) {
      console.log("Error loading profile image:", error);
  
    }
  }, [dispatch, token, user?.profile_image]);
  useEffect(() => {
    loadProfileImage();
  }, [loadProfileImage]);
  useEffect(() => {
    fetchDrawerMenues();
  }, []);

  /* -----------------------------------------
     Logout Handler
  ----------------------------------------- */
  const _promptForLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Yes",
          onPress: () => {
            dispatch(logout());
          },
        },
        { text: "No" },
      ],
      { cancelable: false }
    );
  };
  console.log( Menues, '---------------------- Menues ---------------------');
const handleNavigation = (item:any) => {
  if (item.type === 'screen') {
    props.navigation.navigate(item.screen, item.params || {});
  }

  if (item.type === 'info') {
    props.navigation.navigate('Info', item.params);
  }

  if (item.type === 'external') {
    Linking.openURL(item.params.url);
  }
};
console.log( user.profile_image, '---------------------- user.profile_image ---------------------');
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <DrawerContentScrollView {...props}>
        {/* Profile Avatar */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => props.navigation.navigate("Profile" as never)}
          style={{ marginTop: 10, alignItems: "center" }}
        >
          <Avatar.Image
            size={60}
            source={{ uri:user.profile_image? `${DOMAIN.API_IMAGE_URL}${user.profile_image}`:'https://randomuser.me/api/portraits/men/1.jpg' }}
            style={{ backgroundColor: colors.surface }}
          />

          <MaterialCommunityIcons
            name="account-edit"
            color={colors.onPrimary}
            size={25}
            style={styles.editIcon}
          />
        </TouchableOpacity>

        <Text style={styles.userName}></Text>

        {/* Drawer Section */}
        <Drawer.Section>
   <View
            style={[
              styles.themeRow,
              {
                borderColor: colors.overlay,
                backgroundColor: colors.overlay,
              },
            ]}
          >
            <View style={styles.themeTextWrap}>
              <Text style={[styles.themeLabel, { color: colors.onPrimary }]}>
                Dark mode
              </Text>
              <Text style={[styles.themeHint, { color: colors.textMuted }]}>
                Switch the app palette instantly
              </Text>
            </View>
            <Switch
              value={resolvedMode === "dark"}
              onValueChange={toggleMode}
              // thumbColor={resolvedMode === "dark" ? colors.secondary : colors.surface}
              // trackColor={{ false: colors.border, true: colors.secondary }}
            />
          </View>

          <DrawerItem
            icon={({ size }) => (
              <MaterialCommunityIcons
                name="eye-refresh"
                color={colors.onPrimary}
                size={size}
              />
            )}
            label="Change password"
            labelStyle={[styles.drawerLabel, { color: colors.onPrimary }]}
            onPress={() => props.navigation.navigate("ChangePassword" as never)}
          />

       
        {Menues?.map((item) => (
  <DrawerItem
    key={item.id}
    label={item.title}
    labelStyle={{ color: colors.onPrimary, fontFamily: FONT_FAMILY.normal }}
    icon={({ size }) => (
      <MaterialCommunityIcons
        name={item.icon}
        size={size}
        color={colors.onPrimary}
      />
    )}
    onPress={() => handleNavigation(item)}
  />
))}

          <DrawerItem
            icon={({ size }) => (
              <Icon name="exit-outline" color={colors.danger} size={size} />
            )}
            label="Logout"
            labelStyle={{ color: colors.danger, fontFamily: FONT_FAMILY.normal }}
            onPress={_promptForLogout}
          />
        </Drawer.Section>
      </DrawerContentScrollView>

      <View style={{ alignItems: "center", paddingBottom: 20 }}>
        <Text style={styles.versionText}>{/* Version */}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  editIcon: {
    position: "absolute",
    right: "35%",
    bottom: "0%",
  },
  userName: {
    marginTop: 10,
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: "white",
    textAlign: "center",
  },
  drawerLabel: {
    fontFamily: FONT_FAMILY.normal,
  },
  versionText: {
    color: "grey",
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
  },
  themeRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  themeLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  themeHint: {
    fontFamily: FONT_FAMILY.normal,
    fontSize: 12,
    marginTop: 2,
  },
});


// import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
// import { Alert, Text, TouchableOpacity, View } from "react-native";
// import { Avatar, Drawer } from "react-native-paper";
// import { useDispatch, useSelector } from "react-redux";
// import Icon from "react-native-vector-icons/Ionicons";
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import { useEffect, useState } from "react";
// import { logout } from "../store/slices/authSlice";
// import { DARK_BLUE, FONT_FAMILY } from "../util/colors";
// import { javascriptPost } from "../util/api";
// import { ENDPOINT } from "../util/constant";
// // import DeviceInfo from "react-native-device-info";
// // const Version = DeviceInfo.getVersion()
// export const CustomDrawerContent = (props) => {
// //   const data = useSelector((state) => state?.auth?.userData?.data?.data);
//   const dispatch=useDispatch()
//     const [url, seturl] = useState(null);
//      const fetchUrl = async () => {
  
//         try {
//           const apiRequestObject = {
//             path: "",
//             body: {
//               ws_type: ENDPOINT.documents,
//             },
//           };      
//           const response = await javascriptPost(apiRequestObject);

//           seturl(response.data)
//         } catch (err) {
//             console.log(err,"eklnsdfsdklfsdfklds")
//           return alert('Somthing went wroung.')
//         }
//       };
//       useEffect(() => {
//         fetchUrl();
//       }, []);
//       const _promptForLogout = () => {
//         console.log( '-(---------------jlidjlasd------');
//         Alert.alert(
//           "Logout",
//           "Are you sure, you want to logout?",
//           [
//             {
//               text: "Yes",
//               onPress: async () => {
//                dispatch(logout())
//               },
//             },
//             { text: "No" },
//           ],
//           { cancelable: false }
//         );
//       };
//   return (
//     <View style={{flex:1,backgroundColor:DARK_BLUE}}>
//       <DrawerContentScrollView {...props}>
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={() => props.navigation.navigate("Profile")}
//           style={{ marginTop: 10, alignItems: "center" }}>
//           <Avatar.Image
//             size={60}
//             // source={{ uri: Array.isArray(data) && data[0].profile_image ? `https://15asportsclub.in/15asports/public/profile_pictures/${data[0].profile_image}`:"https://randomuser.me/api/portraits/men/1.jpg" }}
//             source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }}
//             style={{ backgroundColor: "white" }}
//           />
//           <MaterialCommunityIcons
//             name="account-edit"
//             color={"white"}
//             size={25}
//             style={{
//               position: "absolute",
//               alignItems: "center",
//               right: "35%",
//               bottom: "0%",
//             }}
//           />
//         </TouchableOpacity>
//         <Text
//           style={{
//             marginTop: 10,
//             fontSize: 20,
//             fontFamily: FONT_FAMILY.bold,
//             color: "white",
//             textAlign: "center",
//           }}>
//         </Text>
//         <Drawer.Section>
//           <DrawerItem
//             icon={({ color, size }) => (
//               <MaterialCommunityIcons name="eye-refresh" color={"white"} size={size} />
//             )}
//             label="Change password"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() => props.navigation.navigate("ChangePassword")}
//           />
         
//           <DrawerItem
//             icon={({ color, size }) => (
//               <MaterialCommunityIcons name="account-lock" color={"white"} size={size} />
//             )}
//             label="Privacy Policy"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Info", {
//                 index: 0,
//                 name: "Privacy Policy",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <MaterialCommunityIcons
//                 name="clipboard-list-outline"
//                 color={"white"}
//                 size={size}
//               />
//             )}
//             label="Terms & Conditions"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Info", {
//                 index: 1,
//                 name: "Terms & Conditions",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <Icon name="warning" color={"white"} size={size} />
//             )}
//             label="Disclaimer"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Info", {
//                 index:2,
//                 name: "Disclaimer",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <MaterialCommunityIcons name="shield-refresh" color={"white"} size={size} />
//             )}
//             label="Refund and Returns Policy"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Info", {
//                 index: 3,
//                 name: "Refund and Returns Policy",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <Icon
//                 name="information-circle-outline"
//                 color={"white"}
//                 size={size}
//               />
//             )}
//             label="About Us"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Info", {
//                 index:4,
//                 name: "About Us",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <MaterialCommunityIcons name="contacts-outline" color={"white"} size={size} />
//             )}
//             label="Contact Us"
//             labelStyle={{ color: "white", fontFamily: FONT_FAMILY.normal }}
//             onPress={() =>
//               props.navigation.navigate("Contact", {
//                 url: url?.contact_us,
//                 name: "Contact Us",
//               })
//             }
//           />
//           <DrawerItem
//             icon={({ color, size }) => (
//               <Icon name="exit-outline" color={"red"} size={size} />
//             )}
//             label="Logout"
//             labelStyle={{ color: "red", fontFamily: FONT_FAMILY.normal }}
//             onPress={_promptForLogout}
//           />
//         </Drawer.Section>
//       </DrawerContentScrollView>
//       <View style={{ alignItems: "center", paddingBottom: 20 }}>
//         <Text
//           style={{
//             color: "grey",
//             fontSize: 14,
//             fontFamily: FONT_FAMILY.normal,
//           }}>
//           {/* Version {Version} */}
//         </Text>
//       </View>
//     </View>
//   );
// }
