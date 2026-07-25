import {  Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Modal } from 'react-native-paper'
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { javascriptGet } from '../util/api';
import { FONT_FAMILY, LIGHT_BLUE } from '../util/colors';
import { useSelector } from 'react-redux';

const ModifierModal = ({ visible, onClose, onAdd, token,qty }) => {
  const user=useSelector(state=>state.auth)
    const [Modifiers,setModifiers]=useState([])
   
    useEffect(()=>{
     
        // fetchModifiers()
        if(user?.user?.Modifiers){
         setModifiers(user.user.Modifiers)
        }
    
    },[user])
    const [remark,setRemark]=React.useState('');
    const handleAdd=()=>{
       
        if(remark.trim().length){
            
           onAdd(remark);
           setRemark('');
        }else{
            onClose();
        }
    }
  return (
      <Modal
      theme={{
          animationType: "slide",
        }}
    
      visible={visible}
      dismissable
      onDismiss={onClose}
      style={{
          flex: 1,
          backgroundColor: "transparent",
          justifyContent: "flex-end",
          // margin: 15,
          position: "absolute",
        }}
    >
       <KeyboardAwareScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
              }}
              enableOnAndroid
              extraScrollHeight={20}
            >
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 10,
          overflow: "hidden",
          padding:15
        }}
      >
        <View style={{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:0.6,paddingBottom:10,borderBottomColor:'lightgrey'}}>

        <Text  style={{marginLeft: 8,fontFamily:FONT_FAMILY.bold,color:'black',fontSize:18}}>Add Modifiers</Text>
         <Icon
                    onPress={onClose}
                    name="close"
                    size={25}
                    color={'red'}
                    // style={Mo}
                  />
        </View>
         <TextInput
            value={remark}
            onChangeText={setRemark}
            style={{
              borderWidth: 1,
              borderColor: "grey",
              borderRadius: 5,
              padding: 10,
              marginTop: 10,
              fontFamily: FONT_FAMILY.normal,
              color:'black'
            }}
            placeholder="Add Remark"
            placeholderTextColor={"grey"}
            keyboardType="default"
          />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
           flexWrap:'wrap',
            marginTop:10
          }}
        >
           
          {Modifiers?.map((modifier,index)=>(
            <Pressable onPress={()=>{setRemark(prev=>
              prev + modifier + ', '
            )}} key={index} style={{flexDirection:'row',alignItems:'flex-start'}}>
             
              <Text style={{fontFamily:FONT_FAMILY.normal,color:'black',backgroundColor:LIGHT_BLUE,padding:8,margin:4,borderRadius:6}}>{modifier}</Text>
            </Pressable>
          ))}
           
        </View>
        <View style={{alignItems:'flex-end',marginVertical:20}}>

       
                 <Pressable onPress={handleAdd} style={styles.addButton}>
                   <Text style={styles.addText}>Add+</Text>
                 </Pressable>
              
                </View>
      </View>
    </KeyboardAwareScrollView>
    </Modal>
  )
}

export default ModifierModal

const styles = StyleSheet.create({
     addButton: {
        borderWidth: 1,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        borderColor: 'green',
        backgroundColor: "white",
      },
      addText: {
        fontFamily: FONT_FAMILY.bold,
        color: 'green',
      },
      qtyContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'green',
        paddingHorizontal: 5,
      },
})