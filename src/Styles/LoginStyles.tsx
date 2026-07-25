import {StyleSheet} from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { DARK_BLUE, FONT_FAMILY, GREY_COLOR, PRIMARY_BUTTON_BLUE ,} from '../util/colors';


export const Loginstyles = StyleSheet.create({
  container: {
    backgroundColor: DARK_BLUE,
    // paddingHorizontal: 40,
  },
   textInput:{
    color: 'black',
  borderBottomWidth: 1,
  borderBottomColor: '#363b5d',
  borderRadius: 10,
  paddingHorizontal: 10,
  // fontFamily: FONT_FAMILY.normal,
},
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // paddingVertical: 30,
   
  },
  logo: {height: 30, width: 30, borderRadius: 20, resizeMode: 'cover'},
  headdingTitle: {
    color: 'white',
    fontSize: 20,
    marginBottom: 5,
    marginLeft: 5,
    // fontFamily: FONT_FAMILY.normal,
  },
  welcomeText: {
    // fontFamily: FONT_FAMILY.normal,
    color: 'white',
    fontSize: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 15,
    margin:30,
    // justifyContent: 'center',
  },
  signInText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'left',
    // fontFamily: FONT_FAMILY.normal,
    marginLeft: 30,
    // marginBottom: 30,
  },
  submitButton: {
    borderColor: PRIMARY_BUTTON_BLUE,
    borderWidth: 2,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  buttonText: {
    color: PRIMARY_BUTTON_BLUE,
    fontSize: 15,
    // fontFamily: FONT_FAMILY.bold,
  },

  forgotPasswordText: {
    paddingBottom: 10,
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: FONT_FAMILY.light,
    color:'white'
  },
  versionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.light,
    color:'grey'

  },
  dividor: {
    flex: 1,
    borderColor: 'grey',
    borderBottomWidth: 1,
    height: 0,
    margin: 10,
  },
  forgotButton: {
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionContainer: {marginBottom: 20, alignItems: 'center'},
  backToSignInButton: {
    // marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToSignInText: {
    color: GREY_COLOR,
    fontSize: 14,
    paddingVertical: 20,
    fontFamily: FONT_FAMILY.normal,
  },
  inputLabel: {
    color: '#717483',
    fontSize: 16,
    paddingBottom: 10,
    fontFamily: FONT_FAMILY.normal,
  },
    input: {
    borderBottomWidth: 1,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    fontFamily:FONT_FAMILY.normal,
    color:'black'
  },
   bottomText:{
    color:'white',
    fontFamily:FONT_FAMILY.normal
  }
});
