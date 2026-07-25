import * as api from '../../util/api';
import { ENDPOINT } from '../../util/constant';

export type BookingTab = 'Room' | 'Banquet' | 'Activity' | 'Event' | 'Tee' | 'Table';

type FetchBookingsParams = {
  tab: string;
  page?: number;
  token?: string;
};

type FetchBookingsResult = {
  items: any[];
  lastPage: number;
};

const TAB_API_MAP: Record<BookingTab, string> = {
  Room: 'member/room/transaction',
  Banquet: 'member/banquet/transactions',
  Activity: ENDPOINT.get_booking_details,
  Event: ENDPOINT.event_bookings,
  Tee: ENDPOINT.get_tee_bookings,
  Table: 'member/table-bookings',
};

const getEndpointForTab = (tab: string): string | null => {
  return TAB_API_MAP[tab as BookingTab] ?? null;
};

export const fetchBookingsByTab = async ({
  tab,
  page = 1,
  token,
}: FetchBookingsParams): Promise<FetchBookingsResult> => {
  const endpoint = getEndpointForTab(tab);

  // Universal-safe: if a module is unavailable in this project, return empty.
  if (!endpoint) {
    return { items: [], lastPage: 1 };
  }

  try {
    const res = await api.javascriptGet({
      path: `${endpoint}?page=${page}`,
      Token: token,
    });

    if (!res?.status) {
      return { items: [], lastPage: 1 };
    }

    const payload = res.data?.data;
    if (Array.isArray(payload)) {
      return {
        items: payload,
        lastPage: Number(res.data?.last_page ?? 1),
      };
    }

    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      lastPage: Number(payload?.last_page ?? 1),
    };
  } catch (_error) {
    return { items: [], lastPage: 1 };
  }
};
