import {
  THEME_LIGHT_BACKGROUND,
  THEME_LIGHT_DANGER,
  THEME_LIGHT_PLACEHOLDER,
  THEME_LIGHT_PRIMARY,
  THEME_LIGHT_SECONDARY,
  THEME_LIGHT_SUCCESS,
  THEME_LIGHT_SURFACE,
  THEME_LIGHT_SURFACE_ALT,
  THEME_LIGHT_TEXT,
  THEME_LIGHT_TEXT_MUTED,
} from '@env';

const withFallback = (value: string | undefined, fallback: string) =>
  value?.trim() ? value.trim() : fallback;

export const DARK_BLUE = withFallback(THEME_LIGHT_PRIMARY, '#151831');
export const LIGHT_GREEN = '#F5FFE9';
export const PURPLE = withFallback(THEME_LIGHT_SURFACE_ALT, '#363B5D');
export const SECONDARY_COLOR = withFallback(THEME_LIGHT_SECONDARY, '#79ca14');
export const LIGHT_BLUE = withFallback(THEME_LIGHT_SURFACE_ALT, 'rgb(237, 243, 249)');
export const PRIMARY_BUTTON_BLUE = withFallback(THEME_LIGHT_PRIMARY, '#363B5D');

export const PINK_COLOR = '#bb0a1e';
export const WHITE_COLOR = withFallback(THEME_LIGHT_SURFACE, '#ffffff');
export const GREEN_COLOR = withFallback(THEME_LIGHT_SUCCESS, '#609E28');
export const BLACK_COLOR = withFallback(THEME_LIGHT_TEXT, '#000');
export const LIGHT_GREY = '#AEB6BF';

export const GREY_COLOR = withFallback(THEME_LIGHT_TEXT_MUTED, '#979797');
export const RED_COLOR = withFallback(THEME_LIGHT_DANGER, '#F2664A');
export const WHITE_SMOKE = withFallback(THEME_LIGHT_BACKGROUND, '#F5F5F5');
export const LIGHT_RED = '#fff0f0';


export const TICKET_THEME = {
  Member: {
    title:'Member Ticket',
    bg: "#135bec",
    image: "https://club26.org/mobileAPI/tickets/member1.jpg",
  },
  Spouse: {
      title:'Spouse Ticket',
    bg: "#9333ea",
    image: "https://club26.org/mobileAPI/tickets/spouse.jpg",
  },
  Dependent: {
    title:'Dependent Ticket',
    bg: "#059669",
    image: "https://club26.org/mobileAPI/tickets/dependent.jpg",
    //  image: "https://club26.org/mobileAPI/tickets/spouse.jpg",
  },
  Guest: {
    title:'Guest Ticket',
    bg: "#ea580c",
    image: "https://club26.org/mobileAPI/tickets/guest.jpg",
  },
  Vip: {
    title:'VIP Ticket',
    bg: "#ea580c",
    image: "https://club26.org/mobileAPI/tickets/vip.jpg",
  },
};


// export const PRIMARY_BUTTON_BLUE = '#007bff';
export const PLACEHOLDER_COLOR = withFallback(THEME_LIGHT_PLACEHOLDER, '#363b5d');
export const FONT_FAMILY = {
  normal: 'OpenSans-Regular',
  regular:'OpenSans-Regular',
  bold: 'OpenSans-Bold',
    medium: 'OpenSans-SemiBold',
  light: "OpenSans-Light",
  semiBold: "OpenSans-SemiBold",
} as const;
