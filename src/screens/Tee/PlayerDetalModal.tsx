import {
  StyleSheet,
  Text,
  View,
  FlatList,
} from "react-native";
import React from "react";
import { FONT_FAMILY } from "../../util/colors";
import UniversalModal from "../../components/UniversalModal";
import { useAppTheme } from "../../theme/AppThemeProvider";

const PlayerDetalModal = ({ visible, onDismiss, buddy }:{ visible:boolean, onDismiss:()=>void, buddy :any}) => {

const {colors}=useAppTheme()

  return (
    <UniversalModal
      visible={visible}
      setVisible={onDismiss}
     isFull={true}
     title="Players Details"
    >
        <FlatList
          data={buddy || []}
          renderItem={({ item, index }) => (
            <View style={[styles.card,{backgroundColor:colors.border}]}>
              <Text style={[styles.name,{color:colors.secondary}]}>Player {index + 1}:</Text>
              <Text style={{color:colors.placeholder,fontFamily:FONT_FAMILY.normal}}>Player Name: <Text style={[styles.name,{color:colors.text}]}>{item.DisplayName}</Text></Text>

              <Text style={{color:colors.placeholder,fontFamily:FONT_FAMILY.normal}}>Member Id: <Text style={[styles.name,{color:colors.text}]}>{item.MemberID}</Text></Text>
            </View>
          )}
          keyExtractor={(item) => item?.id?.toString()}
        />

    
    </UniversalModal>
  );
};

export default PlayerDetalModal;

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    backgroundColor: "white",

    borderRadius: 10,
  },
  name: {
    fontFamily: FONT_FAMILY.bold,
    color: "black",
  },
  sessionText: {
    marginVertical: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 5,
    backgroundColor: "lightgray",
  },
  buttonText: {
    fontFamily: FONT_FAMILY.bold,
    color: "black",
    marginLeft: 5,
  },
  input: {
    margin: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "lightgray",
    padding: 10,
    color: "black",
    fontFamily: FONT_FAMILY.normal,
  },
  itemContainerStyle: {
    color: "grey",
  },
  itemTextStyle: {
    color: "black",
    fontFamily: FONT_FAMILY.normal,
  },
  searchContainer: {
    margin: 10,
    marginHorizontal: 25,
  },
  placeholderStyle: { color: "grey" },
  card: {
    margin: 10,
    
    padding: 10,
    borderRadius: 10,
  },
});
