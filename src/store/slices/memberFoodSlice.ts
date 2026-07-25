import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MemberFoodOrderType = 'take_away' | 'home_delivery';
export type MemberFoodPaymentMethod = 'subscription' | 'card';

export type MemberFoodMenuItem = {
  outlet_id: number;
  outlet_name: string;
  item_id: number;
  name: string;
  code?: string;
  description?: string;
  capacity?: string;
  rate: number;
  quantity: number;
  notes?: string;
  remark_suggestions?: string[];
  gst?: {
    label?: string;
    rate?: number;
  };
  service_charge?: {
    enabled?: boolean;
    type?: string | null;
    rate?: number;
  };
};

type MemberFoodState = {
  orderType: MemberFoodOrderType | null;
  items: MemberFoodMenuItem[];
  paymentMethod: MemberFoodPaymentMethod;
  deliveryAddress: string;
  deliveryTimeId: number | null;
  deliverySlotLabel: string;
  notes: string;
  memberLocation: string;
};

const initialState: MemberFoodState = {
  orderType: null,
  items: [],
  paymentMethod: 'card',
  deliveryAddress: '',
  deliveryTimeId: null,
  deliverySlotLabel: '',
  notes: '',
  memberLocation: '',
};

const memberFoodSlice = createSlice({
  name: 'memberFood',
  initialState,
  reducers: {
    startFoodOrder: (
      state,
      action: PayloadAction<{
        orderType: MemberFoodOrderType;
        deliveryAddress?: string;
        memberLocation?: string;
      }>,
    ) => {
      const shouldReset = state.orderType !== action.payload.orderType;
      state.orderType = action.payload.orderType;
      state.deliveryAddress = action.payload.deliveryAddress ?? state.deliveryAddress;
      state.memberLocation = action.payload.memberLocation ?? state.memberLocation;

      if (shouldReset) {
        state.items = [];
        state.deliveryTimeId = null;
        state.deliverySlotLabel = '';
        state.notes = '';
        state.paymentMethod = 'subscription';
      }
    },
    addFoodItem: (state, action: PayloadAction<Omit<MemberFoodMenuItem, 'quantity'> & { quantity?: number }>) => {
      const existing = state.items.find(item => item.item_id === action.payload.item_id);
      if (existing) {
        existing.quantity += action.payload.quantity ?? 1;
        return;
      }

      state.items.push({
        ...action.payload,
        quantity: action.payload.quantity ?? 1,
      });
    },
    removeFoodItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.item_id !== action.payload);
    },
    updateFoodQuantity: (state, action: PayloadAction<{ itemId: number; quantity: number }>) => {
      const item = state.items.find(entry => entry.item_id === action.payload.itemId);
      if (!item) {
        return;
      }

      item.quantity = Math.max(1, action.payload.quantity);
    },
    setFoodItemNotes: (state, action: PayloadAction<{ itemId: number; notes: string }>) => {
      const item = state.items.find(entry => entry.item_id === action.payload.itemId);
      if (!item) {
        return;
      }

      item.notes = action.payload.notes;
    },
    setFoodPaymentMethod: (state, action: PayloadAction<MemberFoodPaymentMethod>) => {
      state.paymentMethod = action.payload;
    },
    setFoodDeliveryAddress: (state, action: PayloadAction<string>) => {
      state.deliveryAddress = action.payload;
    },
    setFoodDeliveryTime: (
      state,
      action: PayloadAction<{ deliveryTimeId: number | null; deliverySlotLabel: string }>,
    ) => {
      state.deliveryTimeId = action.payload.deliveryTimeId;
      state.deliverySlotLabel = action.payload.deliverySlotLabel;
    },
    setFoodNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },
    clearFoodCart: state => {
      state.items = [];
      state.paymentMethod = 'subscription';
      state.deliveryTimeId = null;
      state.deliverySlotLabel = '';
      state.notes = '';
    },
  },
});

export const {
  startFoodOrder,
  addFoodItem,
  removeFoodItem,
  updateFoodQuantity,
  setFoodItemNotes,
  setFoodPaymentMethod,
  setFoodDeliveryAddress,
  setFoodDeliveryTime,
  setFoodNotes,
  clearFoodCart,
} = memberFoodSlice.actions;

export default memberFoodSlice.reducer;
