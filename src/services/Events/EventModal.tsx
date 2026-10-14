import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FONT_FAMILY, SECONDARY_COLOR } from "../../util/colors";
import { SafeAreaView } from "react-native-safe-area-context";

const { height, width } = Dimensions.get("window");

const EventModal: React.FC<{
  eventModal: any;
  setEventModal: React.Dispatch<React.SetStateAction<any>>;
}> = ({ eventModal, setEventModal }) => {
  const navigation = useNavigation();

  const closeModal = () => {
    setEventModal({ visible: false });
  };

  const handleNavigate = () => {
    closeModal();
    if (eventModal?.navigation) {
      (navigation as any).navigate(eventModal.navigation, { url: eventModal.data });
    }
  };
console.log( eventModal?.image, '---------------------- eventModal?.image,---------------------');
  return (
    <Modal
      visible={eventModal?.visible}
      transparent
      animationType="fade"
      onRequestClose={closeModal} // ✅ Android back button
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {/* Image */}
                      <TouchableOpacity style={styles.imageWrapper} onPress={handleNavigate}>
         
            <Image
              source={{
                uri:eventModal?.image,
              }}
              style={styles.image}
              resizeMode="contain"
            />
         

          {/* Book Now Button */}

          
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default EventModal;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 50 : 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  closeText: {
    fontSize: 22,
    color: "#fff",
    fontFamily: FONT_FAMILY.bold,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  image: {
    width: width - 30,
    height: height * 0.75, // ✅ safe on both platforms
  },
  bookBtn: {
    position: "absolute",
    bottom: 100,
    backgroundColor: SECONDARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookText: {
    color: "#fff",
    fontFamily: FONT_FAMILY.normal,
  },
});
