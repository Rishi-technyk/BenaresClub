export const addToCart = (memberId, item,tableData) => ({
  type: "ADD_TO_CART",
  payload: { memberId, item,tableData },
});

export const removeFromCart = (memberId, item) => ({
  type: "REMOVE_FROM_CART",
  payload: { memberId, item },
});

export const clearMemberCart = (memberId) => ({
  type: "CLEAR_MEMBER_CART",
  payload: { memberId },
});
export const clearAllCart = () => ({
  type: "CLEAR_ALL_CART",
});
export const updateCartItem = (memberId, itemCode, updates) => ({
  type: "UPDATE_CART_ITEM",
  payload: { memberId, itemCode, updates },
});
export const addRemark = (remark, itemCode, memberId,cartKey) => ({
  type: "ADD_REMARK",
  payload: { remark, itemCode, memberId,cartKey },
});

export const removeRemark = (remark, itemCode, memberId) => ({
  type: "REMOVE_REMARK",
  payload: { remark, itemCode, memberId },
});
export const updateCardBalance = (memberId, newBalance) => ({
  type: "UPDATE_CARD_BALANCE",
  payload: { memberId, newBalance },
});
