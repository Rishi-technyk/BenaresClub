import { ENDPOINT } from '../../util/constant';
import { javascriptGet, javascriptPost } from '../../util/api';

export const getMemberFoodMenu = async (
  token: string,
  orderType: 'take_away' | 'home_delivery',
  search?: string,
   outletId?: string|number
) => {
  const params = new URLSearchParams({
    order_type: orderType,
    outletId: outletId?.toString() || '',
  });

  if (search?.trim()) {
    params.append('search', search.trim());
  }
  return javascriptGet({
    path: `${ENDPOINT.member_food_menu}?${params.toString()}`,
    Token: token,
  });
};

export const getMemberFoodCheckoutSummary = async (
  token: string,
  orderType: 'take_away' | 'home_delivery',
) => {
  const params = new URLSearchParams({
    order_type: orderType,
  });

  return javascriptGet({
    path: `${ENDPOINT.member_food_checkout_summary}?${params.toString()}`,
    Token: token,
  });
};

export const createMemberFoodOrder = async (
  token: string,
  payload: Record<string, any>,
) =>
  javascriptPost({
    path: ENDPOINT.member_food_orders,
    Token: token,
    body: payload,
  });

export const getMemberFoodOrders = async (
  token: string,
  status?: string,
  page: number = 1,
) => {
  const params = new URLSearchParams({
    page: String(page),
  });

  if (status && status !== 'all') {
    params.append('status', status);
  }

  return javascriptGet({
    path: `${ENDPOINT.member_food_orders}?${params.toString()}`,
    Token: token,
  });
};

export const cancelFoodOrder=async (token: string,id:string|number)=>javascriptPost({
    path: ENDPOINT.member_food_cancel+id+'/cancel',
    Token: token,
    body: {

    },
  });
export const getMemberFoodOrderDetails=async (token: string,id:string|number)=>javascriptGet({
    path: ENDPOINT.member_food_order+id,
    Token: token,
    body: {

    },
  });