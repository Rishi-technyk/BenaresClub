import { StyleSheet } from "react-native";
import { FONT_FAMILY, SECONDARY_COLOR } from "../util/colors";

export const ModalStyles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  headingText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 17,
    color: "black",
  },
  headingContainer: {
    borderBottomWidth: 0.3,
    padding: 15,
    borderBlockColor:'grey',
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",backgroundColor:'white',marginBottom:20
  },
  innerModalCont: {
  
  },
  listRow: { flexDirection: "row", margin: 20 },
  downloadText: {
    color: "black",
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
  },
  submitContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    backgroundColor: SECONDARY_COLOR,
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 20,
  },
  cancelText: {
    color: "red",
    fontFamily: FONT_FAMILY.light,
    marginHorizontal: 10,
    textAlign: "right",
  },
  confirmText: {
    color: "white",
    fontFamily: FONT_FAMILY.bold,
    marginHorizontal: 10,
  },
  headerStyle: { fontFamily: FONT_FAMILY.normal, marginLeft: 10 },
});