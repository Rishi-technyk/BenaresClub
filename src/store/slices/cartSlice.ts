
// =======================
// Types
// =======================

export interface TableData {
  [key: string]: any; // customize if structure is known
}

export interface CartItem {
  ItemCode: string;
  qty: number;
  Remarks?: string;
  [key: string]: any; // for extra item properties
}

export interface CartEntry {
  tableData: TableData;
  items: CartItem[];
}

export interface CartState {
  cart: {
    [memberId: string]: CartEntry;
  };
}

// =======================
// Action Types
// =======================

// interface AddToCartAction {
//   type: "ADD_TO_CART";
//   payload: {
//     cart:{
//  memberId: string | number;
//     item: CartItem;
//     tableData: TableData;
//     }
   
   
//   };
// }
interface AddToCartAction {
  type: "ADD_TO_CART";
  payload: {
    memberId: string | number;
    item: CartItem;
    tableData: TableData;
  };
}
interface RemoveFromCartAction {
  type: "REMOVE_FROM_CART";
  payload: {
    memberId: string | number;
    item: CartItem;
  };
}

interface ClearMemberCartAction {
  type: "CLEAR_MEMBER_CART";
  payload: {
    memberId: string | number;
  };
}

interface ClearAllCartAction {
  type: "CLEAR_ALL_CART";
}

interface AddRemarkAction {
  type: "ADD_REMARK";
  payload: {
    memberId: string | number;
    itemCode: string;
    remark: string;
    cartKey:string
  };
}

interface RemoveRemarkAction {
  type: "REMOVE_REMARK";
  payload: {
    memberId: string | number;
    itemCode: string;
  };
}

interface UpdateCartItemAction {
  type: "UPDATE_CART_ITEM";
  payload: {
    memberId: string | number;
    itemCode: string;
    updates: Partial<CartItem>;
  };
}

type CartAction =
  | AddToCartAction
  | RemoveFromCartAction
  | ClearMemberCartAction
  | ClearAllCartAction
  | AddRemarkAction
  | RemoveRemarkAction
  | UpdateCartItemAction;

// =======================
// Initial State
// =======================

const initialState: CartState = {
  cart: {},
};

// =======================
// Reducer
// =======================

const cartReducer = (
  state: CartState = initialState,
  action: CartAction
): CartState => {
  switch (action.type) {

    case "ADD_TO_CART": {
      const cartKey = String(action.payload.memberId);
      const { item, tableData } = action.payload;
      console.log(state.cart,'sdfbsdkjfsfkjdsfskjfshfksfhfdshjfds cart',action.payload)
      const existingCart = state.cart?.[cartKey] || {
        tableData,
        items: [],
      };

      const items = [...existingCart.items];
      const existingIndex = items.findIndex(
        (i) => i.ItemCode === item.ItemCode
      );

      if (existingIndex !== -1) {
        items[existingIndex] = {
          ...items[existingIndex],
          qty: items[existingIndex].qty + 1,
        };
      } else {
        items.push({ ...item, qty: 1 });
      }

      return {
        ...state,
        cart: {
          ...state.cart,
          [cartKey]: {
            tableData,
            items,
          },
        },
      };
    }

    case "REMOVE_FROM_CART": {
      const memberId = String(action.payload.memberId);
      const memberCart = state.cart[memberId];
      if (!memberCart) return state;

      const items = [...memberCart.items];
      const index = items.findIndex(
        (i) => i.ItemCode === action.payload.item.ItemCode
      );

      if (index !== -1) {
        if (items[index].qty > 1) {
          items[index] = { ...items[index], qty: items[index].qty - 1 };
        } else {
          items.splice(index, 1);
        }
      }

      return {
        ...state,
        cart: {
          ...state.cart,
          [memberId]: {
            ...memberCart,
            items,
          },
        },
      };
    }

    case "CLEAR_MEMBER_CART": {
      const memberId = String(action.payload.memberId);
      const newCart = { ...state.cart };
      delete newCart[memberId];
      return { ...state, cart: newCart };
    }

    case "CLEAR_ALL_CART":
      return { ...state, cart: {} };

    case "ADD_REMARK": {
      const { memberId, itemCode, remark } = action.payload;
      console.log(action.payload,'Find the Cart Key--------------',state.cart);
      
      const cartKey = String(memberId);
      const memberCart = state.cart[cartKey];
      console.log(memberCart,'Find the Cart Key--------------',state.cart);
      if (!memberCart) return state;

      const items = memberCart.items.map((item) =>
        item.ItemCode === itemCode
          ? { ...item, Remarks: remark }
          : item
      );
memberCart.tableData={
  ...memberCart.tableData,
  MemberId:memberId
}
      return {
        ...state,
        cart: {
          ...state.cart,
          [cartKey]: { ...memberCart, items },
        },
      };
    }

    case "REMOVE_REMARK": {
      const { memberId, itemCode } = action.payload;
      const cartKey = String(memberId);
      const memberCart = state.cart[cartKey];
      if (!memberCart) return state;

      const items = memberCart.items.map((item) =>
        item.ItemCode === itemCode
          ? { ...item, Remarks: "" }
          : item
      );

      return {
        ...state,
        cart: {
          ...state.cart,
          [cartKey]: { ...memberCart, items },
        },
      };
    }

    case "UPDATE_CART_ITEM": {
      const { memberId, itemCode, updates } = action.payload;
      const cartKey = String(memberId);
      const memberCart = state.cart[cartKey];
      if (!memberCart) return state;

      const items = memberCart.items.map((item) =>
        item.ItemCode === itemCode
          ? { ...item, ...updates }
          : item
      );

      return {
        ...state,
        cart: {
          ...state.cart,
          [cartKey]: { ...memberCart, items },
        },
      };
    }

    default:
      return state;
  }
};

export default cartReducer;

// import { createSlice } from '@reduxjs/toolkit';

// const initialState = {
//   items: [],   // Each entry = one room category
// };

// const cartSlice = createSlice({
//   name: 'cart',
//   initialState,

//   reducers: {

//     /** ----------------------------------------
//      *  Add new room category to cart
//      *  ----------------------------------------*/
//     Add_Item: (state, action) => {
//       // const { room_id } = action.payload;
//       const room_id = Number(action.payload.room_id);

//       const exists = state.items.find((r) => r.room_id === room_id);
//       if (!exists) {
//         state.items.push({
//           room_id,
//           roomcount: 1,
//           adult: '',
//           child_cate: '',
//           selectoccupant: '',
//           occupant_id: '',
//           additional_info: '',
//           amount: 0,
//           book_id: '',
//           guest_name: '',
//           guest_email: '',
//           guest_mobile: '',
//         });
//       }
//     },

//     /** ----------------------------------------
//      *  Increase room count
//      *  ----------------------------------------*/
//     INCREMENT_ROOMCOUNT: (state, action) => {
//       const item = state.items.find((r) => r.room_id === action.payload.room_id);
//       if (item) {
//         item.roomcount += 1;
//       }
//     },

//     /** ----------------------------------------
//      *  Decrease room count
//      *  ----------------------------------------*/
//     DECREMENT_ROOMCOUNT: (state, action) => {
//       const item = state.items.find((r) => r.room_id === action.payload.room_id);
//       if (item && item.roomcount > 1) {
//         item.roomcount -= 1;
//       }
//     },

//     /** ----------------------------------------
//      *  Update Occupant
//      *  ----------------------------------------*/
//     UPDATE_OCCUPANT: (state, action) => {
//       console.log(action)
//       const { room_id, selectoccupant, occupant_id, additional_info } = action.payload;
//       const item = state.items.find((r) => r.room_id === Number(room_id));

//       if (item) {

//         item.selectoccupant = selectoccupant;
//         item.occupant_id = occupant_id;
//         item.additional_info = additional_info;
//       }
//     },

//     /** ----------------------------------------
//      *  Update Adult count
//      *  ----------------------------------------*/
//     UPDATE_ADULT: (state, action) => {
      
//       const { room_id, adult } = action.payload;
//       console.log('Updating adult count for room:', room_id, 'to', adult);
//       const item = state.items.find((r) => r.room_id === room_id);
// console.log('Found item:', item);
//       if (item) item.adult = adult;
//     },

//     /** ----------------------------------------
//      *  Update Child count
//      *  ----------------------------------------*/
//     UPDATE_CHILD: (state, action) => {
//       const { room_id, child_cate } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
//       if (item) item.child_cate = child_cate;
//     },

//     /** ----------------------------------------
//      *  Update Amount (Room Charges)
//      *  ----------------------------------------*/
//     UPDATE_AMOUNT: (state, action) => {
//       const { room_id, amount } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
     
//       if (item) item.amount = amount;
//     },

//     /** ----------------------------------------
//      *  Update Book ID (cart lock)
//      *  ----------------------------------------*/
//     UPDATE_BOOK_ID: (state, action) => {
//       const { room_id, book_id } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
//       if (item) item.book_id = book_id;
//     },

//     /** ----------------------------------------
//      *  Update Guest Name
//      *  ----------------------------------------*/
//     UPDATE_GUEST_NAME: (state, action) => {
//       const { room_id, guest_name } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
//       if (item) item.guest_name = guest_name;
//     },

//     /** ----------------------------------------
//      *  Update Guest Email
//      *  ----------------------------------------*/
//     UPDATE_GUEST_EMAIL: (state, action) => {
//       const { room_id, guest_email } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
//       if (item) item.guest_email = guest_email;
//     },

//     /** ----------------------------------------
//      *  Update Guest Mobile
//      *  ----------------------------------------*/
//     UPDATE_GUEST_MOBLIE: (state, action) => {
//       const { room_id, guest_mobile } = action.payload;
//       const item = state.items.find((r) => r.room_id === room_id);
//       if (item) item.guest_mobile = guest_mobile;
//     },

//     /** ----------------------------------------
//      *  Clear cart
//      *  ----------------------------------------*/
//     REMOVEALL_FROM_CART: (state) => {
//       state.items = [];
//     },
//   },
// });

// export const {
//   Add_Item,
//   INCREMENT_ROOMCOUNT,
//   DECREMENT_ROOMCOUNT,
//   UPDATE_OCCUPANT,
//   UPDATE_ADULT,
//   UPDATE_CHILD,
//   UPDATE_AMOUNT,
//   UPDATE_BOOK_ID,
//   UPDATE_GUEST_EMAIL,
//   UPDATE_GUEST_NAME,
//   UPDATE_GUEST_MOBLIE,
//   REMOVEALL_FROM_CART,
// } = cartSlice.actions;

// export default cartSlice.reducer;
