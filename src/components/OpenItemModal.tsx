import { Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { FONT_FAMILY } from "../util/colors";
import UniversalModal from "./UniversalModal";

interface OpenItemModalProps{
visible:any,
onClose:()=>void,
onAdd:({})=>void,
token:string,
member:any,
tableData:any
}
const OpenItemModal:  React.FC<OpenItemModalProps> = ({ visible, onClose, onAdd, token ,member,tableData}) => {
  const [Amount, setAmount] = React.useState<string |number>("");
  const [Title, setTitle] = React.useState("");
  const [errors, seterror] = useState({});
const cart = useSelector((state) => state?.cart?.cart);

  const handleAddOpenItem = () => {
    if (!Title) {
      seterror({ title: "Please enter a valid title" });
      return;
    }
    if (!Amount || isNaN(Amount)) {
      seterror({ amount: "Please enter a valid amount" });
      return;
    }
    onAdd({ ...visible, ItemName: Title, SP: Number(Amount) }),
      setAmount(""),
      setTitle("");
  };

  return (
   
    <UniversalModal isFull={false} visible={visible} title= {visible?.ItemName || ""} setVisible={onClose}>
      
        <View
          style={{
             flex:1,
      
          }}
        >
       
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              gap: 20,
              padding: 20,
            }}
          >
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Item Name:</Text>
              <TextInput
                value={Title}
                onChangeText={(text) => {
                  setTitle(text),
                    seterror((prev) => ({ ...prev, title: undefined }));
                }}
                style={[
                  styles.input,
                  { borderColor: errors.title ? "red" : "grey" },
                ]}
                placeholderTextColor={"grey"}
                placeholder="Item Title"
                keyboardType="default"
              />
              {errors.title && (
                <Text style={{ color: "red", fontSize: 9 }}>
                  {errors.title}
                </Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rate:</Text>
              <TextInput
                value={Amount}
                onChangeText={(text) => {
                  setAmount(text),
                    seterror((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholderTextColor={"grey"}
                placeholder="₹0.00"
                style={[
                  styles.input,
                  { borderColor: errors.amount ? "red" : "grey" },
                ]}
                keyboardType="numeric"
              />
              {errors.amount && (
                <Text style={{ color: "red", fontSize: 9 }}>
                  {errors.amount}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.qtyContainer}>
            <Pressable onPress={handleAddOpenItem} style={styles.addButton}>
              <Text style={styles.addText}>Add+</Text>
            </Pressable>
          </View>
        </View>
    </UniversalModal>
  );
};

export default OpenItemModal;

const styles = StyleSheet.create({
  inputContainer: {
    flex: 1,
  },
  label: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: "grey",
    marginBottom: 10,
  },
  input: {
    paddingVertical:10,
    borderWidth: 1,
    borderColor: "grey",
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    margin: 20,
  },
  addButton: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderColor: "green",
    backgroundColor: "white",
  },
  addText: {
    fontFamily: FONT_FAMILY.bold,
    color: "green",
  },
  qtyButton: {
    borderWidth: 1,
    borderColor: "grey",
    borderRadius: 5,
    padding: 10,
    marginHorizontal: 20,
  },
  qtyText: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.semiBold,
    color: "black",
  },
  qtyNumber: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: "black",
  },
});
// import { Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
// import React, { useState } from "react";
// import { useSelector } from "react-redux";
// import { FONT_FAMILY } from "../util/colors";
// import UniversalModal from "./UniversalModal";

// interface OpenItemModalProps{
// visible:any,
// onClose:()=>void,
// onAdd:({})=>void,
// token:string,
// member:any,
// tableData:any
// }
// const OpenItemModal:  React.FC<OpenItemModalProps> = ({ visible, onClose, onAdd, token ,member,tableData}) => {
//   const [Amount, setAmount] = React.useState<string |number>("");
//   const [Title, setTitle] = React.useState("");
//   const [errors, seterror] = useState({});
// const cart = useSelector((state) => state?.cart?.cart);

//   const handleAddOpenItem = () => {
//     if (!Title) {
//       seterror({ title: "Please enter a valid title" });
//       return;
//     }
//     if (!Amount || isNaN(Amount)) {
//       seterror({ amount: "Please enter a valid amount" });
//       return;
//     }
//     onAdd({ ...visible, Displayas: Title, SP: Number(Amount) }),
//       setAmount(""),
//       setTitle("");
//   };

//   return (
//     <UniversalModal isFull={false} visible={visible} title= {visible?.Displayas || ""} setVisible={onClose}>
      
//         <View
//           style={{
//              flex:1,
      
//           }}
//         >
       
//           <View
//             style={{
//               flexDirection: "row",
//               justifyContent: "space-around",
//               gap: 20,
//               padding: 20,
//             }}
//           >
//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Item Name:</Text>
//               <TextInput
//                 value={Title}
//                 onChangeText={(text) => {
//                   setTitle(text),
//                     seterror((prev) => ({ ...prev, title: undefined }));
//                 }}
//                 style={[
//                   styles.input,
//                   { borderColor: errors.title ? "red" : "grey" },
//                 ]}
//                 placeholderTextColor={"grey"}
//                 placeholder="Item Title"
//                 keyboardType="default"
//               />
//               {errors.title && (
//                 <Text style={{ color: "red", fontSize: 9 }}>
//                   {errors.title}
//                 </Text>
//               )}
//             </View>
//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Rate:</Text>
//               <TextInput
//                 value={Amount}
//                 onChangeText={(text) => {
//                   setAmount(text),
//                     seterror((prev) => ({ ...prev, amount: undefined }));
//                 }}
//                 placeholderTextColor={"grey"}
//                 placeholder="₹0.00"
//                 style={[
//                   styles.input,
//                   { borderColor: errors.amount ? "red" : "grey" },
//                 ]}
//                 keyboardType="numeric"
//               />
//               {errors.amount && (
//                 <Text style={{ color: "red", fontSize: 9 }}>
//                   {errors.amount}
//                 </Text>
//               )}
//             </View>
//           </View>
//           <View style={styles.qtyContainer}>
//             <Pressable onPress={handleAddOpenItem} style={styles.addButton}>
//               <Text style={styles.addText}>Add+</Text>
//             </Pressable>
//           </View>
//         </View>
//     </UniversalModal>
//   );
// };

// export default OpenItemModal;

// const styles = StyleSheet.create({
//   inputContainer: {
//     flex: 1,
//   },
//   label: {
//     fontFamily: FONT_FAMILY.semiBold,
//     fontSize: 16,
//     color: "grey",
//     marginBottom: 10,
//   },
//   input: {
//     paddingVertical:10,
//     borderWidth: 1,
//     borderColor: "grey",
//     color: "black",
//     fontFamily: FONT_FAMILY.normal,
//     borderRadius: 8,
//     paddingHorizontal: 10,
//   },
//   qtyContainer: {
//     flexDirection: "row",
//     alignItems: "flex-end",
//     justifyContent: "flex-end",
//     margin: 20,
//   },
//   addButton: {
//     borderWidth: 1,
//     paddingVertical: 5,
//     paddingHorizontal: 10,
//     borderRadius: 5,
//     borderColor: "green",
//     backgroundColor: "white",
//   },
//   addText: {
//     fontFamily: FONT_FAMILY.bold,
//     color: "green",
//   },
//   qtyButton: {
//     borderWidth: 1,
//     borderColor: "grey",
//     borderRadius: 5,
//     padding: 10,
//     marginHorizontal: 20,
//   },
//   qtyText: {
//     fontSize: 20,
//     fontFamily: FONT_FAMILY.semiBold,
//     color: "black",
//   },
//   qtyNumber: {
//     fontSize: 18,
//     fontFamily: FONT_FAMILY.semiBold,
//     color: "black",
//   },
// });