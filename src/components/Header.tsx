import React, { useState, ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  GestureResponderEvent,
  Pressable,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { FONT_FAMILY } from "../util/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Icons from "react-native-vector-icons/Entypo";
import DownloadModal from "./DownloadModal";
import { useAppTheme } from "../theme/AppThemeProvider";

interface HeaderProps {
  title: string;
  OpenDropDawn?: (event: GestureResponderEvent) => void;
  isMulti?: boolean;
  isDawnload?: boolean;
  children?: ReactNode;
  toHome?: boolean;
  type?: string;
}

type NavigationRoutes = {
  Invoice?: undefined;
  Statement?: undefined;
  [key: string]: any;
};

const Header: React.FC<HeaderProps> = ({
  title,
  OpenDropDawn,
  isMulti = false,
  isDawnload = false,
  children,
  toHome = false,
  type,
}) => {
  const navigation = useNavigation<NavigationProp<NavigationRoutes>>();
  const [visible, setVisible] = useState<boolean>(false);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.headercontainer}>
      {/* Back Button + Title */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => toHome ? navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        }) : navigation.goBack()}
      >
        <Icon name="chevron-left" size={20} color={colors.onPrimary} />
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>

      {/* Right Controls (Download + Filter) */}
      {isMulti && (
        <View style={styles.rightControls}>
          {/* Download Icon */}
          {isDawnload && (
            <Icon
              name="file-download-outline"
              size={25}
              color={colors.onPrimary}
              style={{ marginHorizontal: 10 }}
              onPress={() => setVisible(true)}
            />
          )}
        
          <DownloadModal
            visible={visible}
            setVisible={setVisible}
            data={type === "Invoice" ? "Credit" : "member"}
          />

          {/* Filter Icon */}
          <Pressable   onPress={OpenDropDawn}>

          <Icons
            name="sound-mix"
            size={20}
            color={colors.onPrimary}
            />
            </Pressable>
        </View>
      )}

      {children}
    </View>
  );
};

export default Header;

/* -----------------------------------------------------
   STYLES
----------------------------------------------------- */

const createStyles = (colors: { primary: string; onPrimary: string }) =>
  StyleSheet.create({
  headercontainer: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    // backgroundColor:'pink',
    elevation: 5,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  title: {
    color: colors.onPrimary,
    fontFamily: FONT_FAMILY.normal,
    fontSize: 17,
    marginLeft: 5,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor:'red',
    justifyContent:'flex-end'
  },
});

// import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
// import React, {useState} from 'react';
// import {useNavigation} from '@react-navigation/native';
// import {DARK_BLUE, FONT_FAMILY} from '../util/colors';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Icons from 'react-native-vector-icons/Entypo';
// import DownloadModal from './DownloadModal';
// const Header = ({title, OpenDropDawn, isMulti, isDawnload = false,children}) => {
//   const navigation = useNavigation();
//   const [visible, setVisible] = useState(false);
//   return (
//     <View style={styles.headercontainer}>
//       <TouchableOpacity
//         style={styles.button}
//         activeOpacity={0.8}
//         onPress={() => navigation.goBack()}>
//         <Icon name="chevron-left" size={20} color={'white'} />
//         <Text style={styles.title}>{title}</Text>
//       </TouchableOpacity>
//       {isMulti && (
//         <View style={{flexDirection: 'row', alignItems: 'center'}}>
//           {isDawnload && (
//             <Icon
//               name="file-download-outline"
//               size={25}
//               color={'white'}
//               style={{marginHorizontal: 10}}
//               onPress={() => setVisible(true)}
//             />
//           )}
//           <DownloadModal
//             visible={visible}
//             setVisible={setVisible}
//             data={title == 'Invoice' ? 'Credit' : 'member'}
//           />
//           <Icons
//             name="sound-mix"
//             size={20}
//             color={'white'}
//             onPress={OpenDropDawn}
//           />
//         </View>
//       )}
//       {children}
//     </View>
//   );
// };

// export default Header;

// const styles = StyleSheet.create({
//   headercontainer: {
//     backgroundColor: DARK_BLUE,
//     padding: 20,
//     paddingBottom: 10,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     elevation: 5,
//   },
//   button: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     alignSelf: 'flex-start',
//   },
//   title: {
//     color: 'white',
//     fontFamily: FONT_FAMILY.normal,

//     fontSize: 17,
//   },
// });
