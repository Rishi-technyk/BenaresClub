import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {  ENDPOINT } from '../../util/constant';
import { javascriptPost, javascriptPostLocal } from '../../util/api';
import { Toast } from 'react-native-toast-notifications';

/* -----------------------------------
   TYPES
------------------------------------*/

export interface User {
  id: string;
  name: string;
  email?: string;
  [key: string]: any; // if API returns more fields
}
interface WaiterPayload {
  apiRequestObject: OTPRequestBody;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface OTPRequestBody {
  body: Record<string, any>;
}

interface OTPPayload {
  apiRequestObject: OTPRequestBody;
}

interface AuthResponse {
  user: User;
  token: string;
}

/* -----------------------------------
   INITIAL STATE
------------------------------------*/

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
};

/* -----------------------------------
   LOGIN WITH EMAIL + PASSWORD
------------------------------------*/

export const login = createAsyncThunk<AuthResponse, LoginPayload>(
  'auth/login',
  async ({ email }) => {
    // Mocking API call
    // await new Promise((r) => setTimeout(r, 600));

    const fakeUser: User = { id: 'u1', name: 'Demo User', email };
    const fakeToken = 'token-demo-123';

    await AsyncStorage.setItem(
      'user',
      JSON.stringify({ user: fakeUser, token: fakeToken })
    );

    return { user: fakeUser, token: fakeToken };
  }
);

/* -----------------------------------
   LOGIN WITH OTP
------------------------------------*/

export const loginWithOTP = createAsyncThunk<
  AuthResponse,               // return type
  OTPPayload,                 // params type
  { rejectValue: string }     // error type
>(
  ENDPOINT.verify_signin_otp,
  async ({ apiRequestObject }, thunkAPI) => {
    try {
      // const response = await javascriptPost({
      //   path: ENDPOINT.verify_signin_otp,
      //   body: apiRequestObject.body,
      // });

         const response = apiRequestObject.body.type ==='waiter' ? await javascriptPostLocal({
              path: ENDPOINT.waiter_login,
              body: apiRequestObject.body,
            }) : await javascriptPost({
              path: ENDPOINT.verify_signin_otp,
              body: apiRequestObject.body,
            });
console.log( response, '---------------------- response --sss-------------------');
      if (!response.status) {
        return thunkAPI.rejectWithValue(response.message || 'Invalid OTP');
      }

      const user: User = response.data;
      const token: string = response.token || response?.token;

      await AsyncStorage.setItem('user', JSON.stringify({ user, token }));

      return { user, token };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);
export const loginWaiter = createAsyncThunk<
  AuthResponse,
  WaiterPayload,
  { rejectValue: string }
>(
  ENDPOINT.verify_signin_otp,
  async ({ apiRequestObject }, thunkAPI) => {
    try {
      const response = await javascriptPostLocal({
          path: ENDPOINT.staff_verify_signin_otp,
        body: apiRequestObject.body,
      });
      console.log( response, '---------------------- response ---------------------');
      if (!response?.status) {
         Toast.show(response.message||'Invalid OTP',{type:'danger'})
        return thunkAPI.rejectWithValue(
          response?.message || 'Invalid OTP'
        );
      }

      // ✅ NORMALIZATION (KEY FIX)
      const user: User =
        Array.isArray(response?.data)
          ? response.data[0]
          : response.data;

      const token: string =
        response?.data?.token || response?.token;

      await AsyncStorage.setItem(
        'user',
        JSON.stringify({ user, token })
      );
      return { user, token };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);
/* -----------------------------------
   SLICE
------------------------------------*/

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      AsyncStorage.removeItem('user').catch(() => {});
    },

    loginSuccess(state, action: PayloadAction<AuthResponse>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
  },

  extraReducers: (builder) => {
    builder

      // EMAIL/PASSWORD LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state) => {
        state.loading = false;
      })

      // OTP LOGIN
      .addCase(loginWithOTP.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginWithOTP.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginWithOTP.rejected, (state) => {
        state.loading = false;
      });
  },
});

/* -----------------------------------
   EXPORTS
------------------------------------*/

export const { logout, loginSuccess } = authSlice.actions;

export default authSlice.reducer;
