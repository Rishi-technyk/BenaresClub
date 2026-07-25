import React, { useEffect } from "react";
import { StyleSheet, View, Text, Platform, Pressable, KeyboardAvoidingView } from "react-native";
import { Portal } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  ScrollView,
} from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ModalStyles } from "../Styles/ModalStyles";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAppTheme } from "../theme/AppThemeProvider";
import { FONT_FAMILY } from "../util/colors";

interface UniversalModalProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  isFull?: boolean;
}

const CLOSE_THRESHOLD = 150; // how far to drag to close

const UniversalModal: React.FC<UniversalModalProps> = ({
  visible,
  setVisible,
  title,
  children,
  isFull = false,
}) => {
  const translateY = useSharedValue(500); // Start off-screen
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const maxHeight = isFull ? "100%" : "55%";

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 250 });
    } else {
      translateY.value = withTiming(500, { duration: 200 });
    }
  }, [visible]);

  const closeSheet = () => setVisible(false);

  const gestureHandler = ({
    nativeEvent,
  }: PanGestureHandlerGestureEvent) => {
    const y = nativeEvent.translationY;

    // User dragging downward
    if (y > 0) {
      translateY.value = y;
    }

    // User drags upward → modal follows instantly without bounce
    if (y < 0) {
      translateY.value = y * 0.4; // small resistance, optional
    }
  };

  const endGesture = ({
    nativeEvent,
  }: PanGestureHandlerGestureEvent) => {
    if (nativeEvent.translationY > CLOSE_THRESHOLD) {
      translateY.value = withTiming(500, { duration: 200 });
      runOnJS(closeSheet)();
    } else {
      translateY.value = withTiming(0, { duration: 200 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.backdrop} onTouchEnd={closeSheet} />

      {/* Gesture Root for Portal */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler
         activeOffsetY={[-200, 200]}
  failOffsetX={[-400, 400]}
   onGestureEvent={gestureHandler}
    onEnded={endGesture}>
          <Animated.View
            style={[
              styles.modalContainer,
              { height: maxHeight },
              animatedStyle,
            ]}
          >
            <View style={styles.headingContainer}>
              <Text style={styles.headingText}>{title}</Text>
              <Pressable  onPress={closeSheet}>

              <Icon
                name="close"
                size={25}
                style={ModalStyles.cancelText}
                
                />
                </Pressable>
            </View>
     <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  style={{ flex: 1 }}
  keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
>
  <KeyboardAwareScrollView
     nestedScrollEnabled={true}
    enableOnAndroid={true}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{
      flexGrow: 1,
      padding: 20,
    }}
  >

            <View style={{ flex: 1}}>{children}</View>
     
      </KeyboardAwareScrollView>
     </KeyboardAvoidingView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Portal>
  );
};

export default UniversalModal;

const createStyles = (colors: {
  background: string;
  primary: string;
  onPrimary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
}) => StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    // backgroundColor:'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
    headingContainer: {
    borderBottomWidth: 0.3,
    padding: 15,
    borderBlockColor:'grey',
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",backgroundColor:colors.surface,marginBottom:20
  },
   headingText: {
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 17,
      color: colors.text,
    },
});
