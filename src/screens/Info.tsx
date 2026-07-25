import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Header from '../components/Header'
import RenderHTML from 'react-native-render-html'
import { FONT_FAMILY } from '../util/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/AppDrawer';
import { useAppTheme } from '../theme/AppThemeProvider';

const { height, width } = Dimensions.get("window");
type Props=NativeStackScreenProps<AppStackParamList,'Info'>
const Info:React.FC<Props> = ({ route }) => {
   const { colors } = useAppTheme();
   const Data=JSON.parse(route.params)
   console.log( route.params, '---------------------- data ---------------------');
  return (
    <View style={{flex:1}}>
      <Header title={Data.name} />
      <ScrollView style={{}}>
        <RenderHTML
          source={{
            html: Data.data,
          }}
          
           imagesMaxWidth={width - 40}
          enableUserAgentStyles={true}
                  contentWidth={width - 40}
                   baseStyle={{ 
                    fontFamily: FONT_FAMILY.normal ,
                    color:colors.text,
                  textAlign:'auto',
                    margin:20,
                  flex:1
                  }}
                  tagsStyles={{
    img: {
      width: '100%',
      height: 'auto',
      alignSelf: 'center',
      resizeMode: 'contain',
    },}}
        />
      </ScrollView>
    </View>
  );
}

export default Info

const styles = StyleSheet.create({})