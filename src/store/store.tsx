import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authSlice from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import memberFoodReducer from './slices/memberFoodSlice';
import themeReducer from './slices/themeSlice';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistConfig } from 'redux-persist';
import { roomsApi } from '../screens/Bookings/Room/roomsApi';

// ---------------------
// Root Reducers
// ---------------------
const rootReducer = combineReducers({
  auth: authSlice,
  cart: cartReducer,
  memberFood: memberFoodReducer,
  theme: themeReducer,
  [roomsApi.reducerPath]: roomsApi.reducer,
});

// ---------------------
// Persist Config (Typed)
// ---------------------
const persistConfig: PersistConfig<ReturnType<typeof rootReducer>> = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'cart', 'memberFood', 'theme'], // reducers to persist
};

// ---------------------
// Persisted Reducer
// ---------------------
const persistedReducer = persistReducer(persistConfig, rootReducer);

// ---------------------
// Configure Store
// ---------------------
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(roomsApi.middleware),
});

// ---------------------
// Persistor
// ---------------------
export const persistor = persistStore(store);

// ---------------------
// Types for useSelector + useDispatch
// ---------------------
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
