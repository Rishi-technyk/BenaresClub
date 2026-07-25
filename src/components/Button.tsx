import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { FONT_FAMILY } from "../util/colors";
import { useAppTheme } from "../theme/AppThemeProvider";

/* -------------------------------------------
   Types
------------------------------------------- */

interface NewButtonProps {
  text: string;
  onPress?: (event: GestureResponderEvent) => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/* -------------------------------------------
   Component
------------------------------------------- */

const NewButton: React.FC<NewButtonProps> = ({
  text,
  onPress,
  loading = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.buttonContainer, style]}
      disabled={loading}
      onPress={onPress}
    >
      {loading && (
        <ActivityIndicator color={colors.onPrimary} style={{ marginRight: 10 }} />
      )}

      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};

export default NewButton;

/* -------------------------------------------
   Styles
------------------------------------------- */

const createStyles = (colors: {
  secondary: string;
  onPrimary: string;
  primary: string;
}) =>
  StyleSheet.create({
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    padding: 10,
    borderRadius: 5,
    flexDirection: "row",
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
});

// import React from 'react';
// import {
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';
// import { FONT_FAMILY, SECONDARY_COLOR,DARK_BLUE } from '../util/colors';

// const NewButton = ({text, onPress, loading}) => {
//   return (
//     <TouchableOpacity
//       activeOpacity={0.9}
//       style={{
//         // flex: 1,
//         alignItems: 'center',
//         justifyContent: 'center',
//         // alignSelf: "flex-end",
//         backgroundColor: SECONDARY_COLOR,
//         padding: 10,
//         borderRadius: 5,
//         flexDirection: 'row',
//       }}
//       disabled={loading}
//       onPress={onPress}>
//       {loading && (
//         <ActivityIndicator color={'white'} style={{marginRight: 10}} />
//       )}
//       <Text
//         style={{
//           color: 'white',
//           fontSize: 16,
//           fontFamily: FONT_FAMILY.semiBold,
//           textAlign: 'center',
//         }}>
//         {text}
//       </Text>
//     </TouchableOpacity>
//   );
// };
// const styles = StyleSheet.create({
//   submitButton: {
//     backgroundColor: DARK_BLUE,
//     borderRadius: 10,
//   },
// });
// export default NewButton;
