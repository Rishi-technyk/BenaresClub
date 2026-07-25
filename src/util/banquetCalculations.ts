export const toAmount = (value: unknown): number => {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmount = (value: unknown): string =>
  toAmount(value).toFixed(2);

export const calculateBanquetAmounts = (venue: any, rateOverride?: unknown) => {
  const rate = toAmount(rateOverride ?? venue?.rate);
  const gstPer = toAmount(venue?.GSTper ?? venue?.gst_per);
  const gstAmount = (rate * gstPer) / 100;
  const securityDeposit = toAmount(
    venue?.security_deposit ?? venue?.securityDeposit,
  );
  const clearingCharge = toAmount(
    venue?.clearing_charge ?? venue?.clearingCharge,
  );
  const totalWithGST = rate + gstAmount + securityDeposit + clearingCharge;

  return {
    rate,
    gstPer,
    gstAmount,
    securityDeposit,
    clearingCharge,
    totalWithGST,
  };
};

export const calculateBanquetTotal = (venues: any[] = []): number =>
  venues.reduce((sum, venue) => {
    if (!venue?.rate) {
      return sum;
    }

    return sum + calculateBanquetAmounts(venue).totalWithGST;
  }, 0);

export const getBanquetVenueGroupId = (venue: any): string | undefined => {
  const groupId =
    venue?.group_id ??
    venue?.venue_group_id ??
    venue?.venue_charges?.[0]?.venue_group_id;

  return groupId == null ? undefined : String(groupId);
};

export const hasSelectedVenue = (venue: any): boolean =>
  Boolean(venue?.id && String(venue.id) !== '0');

export const findBanquetCharge = (
  venue: any,
  sessionId: unknown,
  occupantId: unknown,
) => {
  const charges = Array.isArray(venue?.venue_charges)
    ? venue.venue_charges
    : [];

  return charges.find(
    (charge: any) =>
      String(charge?.session_id) === String(sessionId) &&
      String(charge?.occupant_id) === String(occupantId),
  );
};

export const applyBanquetSessionCharge = (
  venue: any,
  session: any,
  occupantId: unknown,
) => {
  const charge = findBanquetCharge(venue, session?.id, occupantId);

  if (!charge) {
    return null;
  }

  const amounts = calculateBanquetAmounts(venue, charge.rate);

  return {
    ...venue,
    sessionID: session?.id,
    sessionName: session?.name ?? '',
    rate: amounts.rate,
    gstAmount: amounts.gstAmount,
    gst_per: amounts.gstPer,
    securityDeposit: amounts.securityDeposit,
    clearingCharge: amounts.clearingCharge,
    totalWithGST: amounts.totalWithGST,
  };
};
