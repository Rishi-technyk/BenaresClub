import * as api from "../../util/api";
import { useQuery } from "@tanstack/react-query";
import { ENDPOINT } from "../../util/constant";
import moment from "moment";

const fetchTransactions = async ({ queryKey }:{queryKey:any[]}) => {
  const [, startDate, endDate, memberId, token] = queryKey;

  const body =
    startDate && endDate
      ? {
          ws_type: ENDPOINT.invoice_transaction_filter,
          start_date: startDate,
          end_date: endDate,
          member_id: memberId,
        }
      : {
          ws_type: ENDPOINT.invoice,
          member_id: memberId,
        };

  const apiRequestObject =
    startDate && endDate
      ? {
          path: ENDPOINT.invoice_transaction_filter,
          body: body,
          Token: token,
        }
      : {
          path: ENDPOINT.invoice,
          body: body,
          Token: token,
        };

  const response = await api.javascriptPost(apiRequestObject);

  if (!startDate && !endDate) {
    const summaryBody = {
      ws_type: ENDPOINT.account_summary,
      member_id: memberId,
    };

    const summaryRequestObject = {
      path: ENDPOINT.account_summary,
      body: summaryBody,
      Token: token,
    };

    const data = await api.javascriptGet(summaryRequestObject);
   let newData = {
      ...response,
      closing_balance: data.data.outstanding_amt,
      opening_balance: data.data.bill_amt,
      credit_amt: data.data.total_credit,
      debit_amt: data.data.total_debit,
    };
    return newData;
  } else {
    return response;
  }
};
export async function getStatement({ queryKey }) {
  const [, member_id, token] = queryKey;

  let body = {};
  body.member_id = member_id;

  try {
    const apiRequestObject = {
      path: ENDPOINT.statement,
      body: body,
      Token: token,
    };
    const response = await api.javascriptPost(apiRequestObject);

    return response;
  } catch (err) {
    console.error(err);
    return { result: FAILURE };
  }
}

export const useStatments = (userData) => {
  const memberId = userData?.user?.MemberID;
  return useQuery({
    queryKey: ["statments", memberId, userData?.token],
    queryFn: getStatement,
    enabled: !!userData?.token,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
export const useTransactions = (startDate, endDate, userData) => {
  const memberId = userData?.user?.MemberID;

  return useQuery({
    queryKey: [
      "transactions",
      startDate || "",
      endDate || "",
      memberId,
      userData?.token,
    ], // Ensure unique key
    queryFn: fetchTransactions,
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
    retry: 2,
    refetchOnWindowFocus: false, // Prevent refetching on tab switch
  });
};
const fetchSlots = async (id, 
  // session_id, date, 
  token) => {
  try {
    const apiRequestObject = {
      path: `${ENDPOINT.get_slots + id}`,
      body: {
        // from_date: date,
        // to_date: moment(date).add(3, "days").format("YYYY-MM-DD"),
        // sessionId: session_id,
      },
      Token: token,
    };

    const response = await api.javascriptPost(apiRequestObject);
   return response;
  } catch (error) {
    console.error(error, "from api");
  }
};
const fetchActivitySessions = async (id, session_id, token) => {
  console.log('--------------------------heere is coming')
  try {

    const apiRequestObject = {
      path: ENDPOINT.sessions,
      body: {},
      Token: token,
    };
    let response = await api.javascriptGet(apiRequestObject);
 console.log(
      response,
      "apiRequestObject apiRequestObject apiRequestObject", ENDPOINT.sessions,
    );
    return response;
  } catch (error) {}
};

const fetchPlayers = async (memberId, token,Active,NonMember,Member) => {
  try {
    const apiRequestObject = {
      path: ENDPOINT.favorite_players,
      body: {
        is_favorite: Active ?1:0,
        member: Member,
        nonmember: NonMember,
      },
      Token: token,
    };
    console.log('\x1b[36m%s\x1b[0m', apiRequestObject, '---------------------- apiRequestObject ---------------------');
    
    const response = await api.javascriptPost(apiRequestObject);
     console.log( response, '---------------------- apiRequestObject ---------------------');
     return response;
  } catch (error) {
    console.log('\x1b[36m%s\x1b[0m', error, '---------------------- error ---------------------');
  }
};

export const useSlots = (id, 
  // session_id, date,
   token) => {
 // Fetch facility slots
  const slotsQuery = useQuery({
    queryKey: ["slots", id || "", 
      // session_id || 0, date, 
      token],
    queryFn: () => fetchSlots(id, 
      // session_id, date,
       token),
    enabled: true,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Fetch sessions (only once at first render if token exists)
   console.log('\x1b[34m%s\x1b[0m', token, '---------------------- error ---------------------');
  const sessionsQuery = useQuery({
    queryKey: ["activity-sessions"],
    queryFn: () => fetchActivitySessions(id || "", session_id || 0, token),
    enabled: true,
    staleTime: Infinity, // never refetch unless manually
    
    retry: 1,
  });

  return { slotsQuery, sessionsQuery };
};
const getchGameTypes = async (facility, token) => {
  try {
    const apiRequestObject = {
      path: ENDPOINT.game_type + facility,
      Token: token,
      body: {},
    };
    const response = await api.javascriptGet(apiRequestObject);
    console.log(response)
    return response;
  } catch (error) {
    console.error("Error fetching game types:", error);
  return { status: false, error };
  }
};
const getGuests = async (member_id, page, search,token) => {
  try {
    const apiRequestObject = {
      path: `${
        ENDPOINT.get_guest_info + member_id
      }?page=${page}&search=${search}`,

      body: {},
      Token:token
    };
   const response = await api.javascriptGet(apiRequestObject);
  return response||[];
  } catch (error) {
   
  }
};

export const usePlayers = (page, search, facility, userData) => {
  const token = userData?.token;
  const member_id = userData?.user?.id;
  // Fetch facility slots
  const guestQuery = useQuery({
    queryKey: ["guests", member_id, page || 1, search, token],
    queryFn: () => getGuests(member_id, page, search, token),
    enabled: true,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Fetch sessions (only once at first render if token exists)
  const gameQuery = useQuery({
    queryKey: ["game_type"],
    queryFn: () => getchGameTypes(facility, token),
    enabled: true,
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: 1,
  });

  return { guestQuery, gameQuery };
};

export const usePlayersQuery = ( userData,Active,NonMember,Member) => {
  const token = userData?.token;
   const member_id = userData?.user?.id;
  // Fetch sessions (only once at first render if token exists)
  const playersQuery = useQuery({
    queryKey: ["players", Active, NonMember, Member],
    queryFn: () => fetchPlayers(member_id,token,Active,NonMember,Member),
    enabled: !!token , 
    staleTime: Infinity, // never refetch unless manually
    retry: 1,
  });

  return {  playersQuery };
};
