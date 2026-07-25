import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  GestureResponderEvent,
} from "react-native";
import { FONT_FAMILY } from "../util/colors";
import { useAppTheme } from "../theme/AppThemeProvider";

interface Button2Props {
  text: string;
  onPress?: (event: GestureResponderEvent) => void;
  loading?: boolean;
}

const Button2: React.FC<Button2Props> = ({ text, onPress, loading = false }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={{ marginVertical: 10 }}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.submitButton}>
        {loading && (
          <ActivityIndicator color={colors.text} style={{ marginRight: 10 }} />
        )}
        <Text style={styles.buttonText}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button2;

/* -----------------------------------------
   Styles
----------------------------------------- */

const createStyles = (colors: { primary: string; surface: string }) =>
  StyleSheet.create({
    submitButton: {
      borderColor: colors.border,
      borderWidth: 2,
      paddingVertical: 20,
      marginHorizontal: 0,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 50,
      flexDirection: "row",
      backgroundColor: colors.surface,
    },
    buttonText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
    },
  });

// import {
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   ActivityIndicator,
// } from "react-native";
// import React from 'react'
// import {FONT_FAMILY, PURPLE} from '../util/colors'

// const Button2 = ({ text, onPress, loading }) => {
//   return (
//     <TouchableOpacity
//       style={{ marginVertical:10 }}
//       activeOpacity={0.8}
//       onPress={onPress}>
//       <View style={styles.submitButton}>
//         {loading && (
//           <ActivityIndicator
//             color={PURPLE}
//             style={{ marginRight: 10 }}
//           />
//         )}
//         <Text style={styles.buttonText}>{text}</Text>
//       </View>
//     </TouchableOpacity>
//   );
// };

// export default Button2

// const styles = StyleSheet.create({  submitButton: {
//     borderColor: PURPLE,
//     borderWidth: 2,
//     paddingVertical: 20,
//     marginHorizontal:0,
//     justifyContent: "center",
//     alignItems: "center",
//     borderRadius: 50,
//     flexDirection:'row'
//   },
//   buttonText: {
//     color: PURPLE,
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   })