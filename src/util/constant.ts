// Import environment variables (typed)
import {
  APP_NAME,
  API_BASE_URL,
  API_IMAGE_URL,
  API_LOCAL_URL,
  API_CATEGORY_URL,
  PUSHER_APP_CLUSTER,
  WS_PORT,
  WS_HOST,
  PUSHER_APP_KEY,
  BROADCASTER,
  PUBLIC_URL,
  ICON_URL
} from '@env';

/* ------------------------------------------------------------------
   Types for Env Variables (optional but recommended)
-------------------------------------------------------------------*/

export interface EnvConfig {
  APP_NAME:string;
  API_BASE_URL: string;
  API_IMAGE_URL: string;
  API_CATEGORY_URL: string;
  API_LOCAL_URL: string;
  PUSHER_APP_CLUSTER: string;
  WS_PORT: string;
  WS_HOST: string;
  PUSHER_APP_KEY: string;
  BROADCASTER: string;
  PUBLIC_URL:string;
  ICON_URL:string;
}

export const ENV: EnvConfig = {
  APP_NAME,
  API_BASE_URL,
  API_IMAGE_URL,
  API_CATEGORY_URL,
  PUSHER_APP_CLUSTER,
  WS_PORT,
  WS_HOST,
  API_LOCAL_URL,
  PUSHER_APP_KEY,
  BROADCASTER,
  PUBLIC_URL,
  ICON_URL
};

/* ------------------------------------------------------------------
   DOMAIN CONSTANTS
-------------------------------------------------------------------*/
console.log(PUBLIC_URL,'skldfkdksdfjsdlsfsdklfdsfklsdfkldsf');
export const DOMAIN = {
  APP_NAME:APP_NAME,
  // BASE: API_BASE_URL,
  BASE: 'https://www.lgc.in/MemberPortal/api/v2/',
  // LOCAL:API_LOCAL_URL,
  // LOCAL:'http://192.168.100.100:8000/api/',
  API_IMAGE_URL:API_IMAGE_URL,
  // IMG:PUBLIC_URL,
  IMG:'https://www.lgc.in/MemberPortal/public/',
  ICON_URL:ICON_URL
};

/* ------------------------------------------------------------------
   NETWORK CONSTANTS
-------------------------------------------------------------------*/

export const NETWORK_CONSTANTS = {
  connectionTimeout: 100000, // 2 minutes
};

/* ------------------------------------------------------------------
   ENDPOINTS (Typed as const to preserve string literal types)
-------------------------------------------------------------------*/

export const ENDPOINT = {
  documents: "documents",
  login: "auth/login",
  member_profile: "member_profile",
  logout: "logout",
  create_recharge_pay_order: "member/create_pay_order",
  create_invoice_pay_order: "member/create_invoice_pay_order",
  process_payment: "member/process_payment",
 club_menu:'member/club-menues',
  appointment: "appointment",
  app_history: "app_history",
  statement: "member/transation/summery",
  card_recharge: "card_recharge",
  generate_id: "generate_id",
  pay_success: "pay_success",
  cancel_appointment: "cancel_appointment",
  tee_avail: "tee_avail",
  tee_book: "tee_book",
  member_search: "member_search",
  member_search_id: "member_search_id",
  tee_delete: "tee_delete",
  tee_lock: "tee_lock",

  otp: "member/otp",
  card_balance: "member/card_balance",
  account_summary: "member/account_summary",
  get_facility: "member/get-facility",

  transaction: "member/transaction",
  menus: "menus",
  transaction_filter: "member/transaction_filter",

  editProfile: "editProfile",
  change_password: "member/change_password",
  forgot_password: "auth/forgot-password",

  card_recharge_response: "card_recharge_response",
  invoice_payment: "invoice_payment",
  invoice_recharge_response: "invoice_recharge_response",

  verify_otp: "auth/verify-otp",
  verify_signin_otp: "auth/verify_login_otp",
  send_OTP_Signin: "auth/send_login_otp",

  notification: "notifications",

  invoice: "member/invoice_transaction",
  invoice_transaction_filter: "member/invoice_transaction_filter",
  invoice_transaction_download: "member/invoice_transaction_download",
  transaction_download: "member/transaction_download",
  financial_home_dashboard: "member/financial/home-dashboard",
  financial_statement_dashboard: "member/financial/statement-dashboard",
  financial_recharge_dashboard: "member/financial/recharge-dashboard",
  financial_ask_ai: "member/financial/ask-ai",

  affilated_clubs: "affilated_clubs",

  create_pay_order: "member/create_pay_order",
  centralized_payment_initiate: "member/payments/initiate",
  centralized_payment_verify: "member/payments/verify",
  centralized_payment_status: "member/payments/status/",
  centralized_payment_retry: "member/payments/retry/",
  feedBack: "member/feedback",

    //tee
  tee_settings:'member/get/tee/setting',
  tee_sessions:'member/get/sessions',
  tee_srarch_buddies:'member/get/buddies/',
    tee_delete_group:'member/delete/tee/group/',
  tee_add_group:'member/create/tee/group',
  tee_edit_group:'member/update/tee/group/',
  tee_group:'member/get/tee/group',
  tee_favorite_group:'member/get/tee/group/favorite/',
  tee_cancel_booking:'member/cancel/tee/booking/',

  reserve_tee:'member/book/tee/session',
  get_tee_bookings:"member/get/tee/bookings",
  tee_booking_detail:"member/tee/booking/detail/",
  tee_add_buddy:'member/create/tee/buddy',
  tee_edit_buddy:'member/update/tee/buddy/',
  tee_delete_buddy:'member/delete/tee/buddy/',

  // Facility
  get_slots: "member/get-facility-slots/",
  sessions: "member/get/activity/sessions",
  game_type: "member/get-game-type/",
  get_guest_info: "member/get-guest-info/",
  create_activity_guest: "member/create-activity-guest",
  book_facilities: "member/book-facilities",
  update_activity_guest:'member/update-activity-guest/',
  favorite_players: "member/favorite-players",
  editPlayer:'member/edit-player',
  // Bookings
  get_booking_details: "member/get-booking-details",
  get_cancellation_amount: "get-cancellation-amount/",
  cancel_booking: "cancel-booking",
  getvenue_menu:'member/get/venue-menu',

  //Event
  event_setting:'member/events/',
  all_event:'member/get/events',
  admin_event_setting:'event/settings',
  event_admin_dashboard:'event/event-summary?',
  event_admin_payment_type:'event/payment-types',
  ticket_preview:'member/tickets/preview',
  event_booking_detail:'member/event-bookings',
  admin_event_summary:'event/event-summary-pdf',
  admin_validate_ticket:'event/validate-qr-ticket',
  event_bookings:'member/event-bookings',
  event_admin_bookings:'event/event-bookings',
  event_payment_failed:'member/event/payment-failed',
      process_event_payment:"member/tickets/process-payment", 
       process_admin_payment:"event/book-tickets",

       // Member food order
       member_food_menu:'member/food/menu',
       member_food_checkout_summary:'member/food/checkout-summary',
       member_food_orders:'member/food/orders',
       member_food_cancel:'member/food/orders/',
       member_food_order:'member/food/orders/',

       //mmr
       get_mmr_settings:'member/get-mmr',
       register_mmr_member:'member/register/mmr-member',
       mmr_history:'member/mmr-history',


       //KOT
           waiter_login: "waiter/login",
      staff_verify_signin_otp: "waiter/verify-otp",
       staff_group_items:'staff/group/items',
  member_group_items:'member/group/items',
 waiter_place_order:'staff/place-order',
  place_order:'member/place-order',
 get_active_orders:'staff/get-active-orders',
 get_cart_data:'staff/get-cart-data?',
 get_kot_reciept:'staff/get-reciept/',
  get_member_kot_reciept:'member/get-reciept/',
 complete_kot_order:'staff/complete-order/',
 modifyKOT:'staff/modify-kot',
 kot_remarks:'staff/kot-remarks',
} as const;

// Optional: Export Type for endpoint keys
export type EndpointKeys = keyof typeof ENDPOINT;
