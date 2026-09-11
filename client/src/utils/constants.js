export const HOST = import.meta.env.VITE_SERVER_URL;

export const AUTH_ROUTES = "api/auth";
export const SIGNUP_ROUTE = `${AUTH_ROUTES}/signup`;
export const LOGIN_ROUTE = `${AUTH_ROUTES}/login`;
export const GET_USER_INFO = `${AUTH_ROUTES}/user-info`;
export const UPDATE_AVATAR_ROUTE = `${AUTH_ROUTES}/update-avatar`;

export const LOGOUT_ROUTE = `${AUTH_ROUTES}/logout`;

export const MESSAGE_ROUTE = "/api/contact";

export const ROOM_ROUTE = "/api/rooms"; // apiClient baseURL + '/rooms'
export const ROOM_JOIN_ROUTE = "/api/rooms/join-room"; // -> POST: join
export const HISTORY_ROUTE = "/api/history";