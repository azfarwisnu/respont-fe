const init_state = {
  tab: "",
  opponent: "",
  opponents: [],
  address: "",
  signer: "",
  storage: "",
  updater: {},
  localStorage: {},
  socketId: "",
  connection: [],
  room: "",
  scanning: false,
};

const reducer = (state = init_state, action) => {
  switch (action.type) {
    case "GET_POSITION":
      return { ...state, tab: action.data };
    case "GET_STARTING_CHAT":
      return { ...state, opponent: action.data };
    case "STORE_MESSAGE":
      return { ...state, opponents: action.data };
    case "STORE_ADDRESS":
      return { ...state, address: action.data };
    case "STORE_SIGNER":
      return { ...state, signer: action.data };
    case "STORE_STORAGE":
      return { ...state, storage: action.data };
    case "AUTO_UPDATER":
      return { ...state, updater: action.data };
    case "SET_LOCAL_STORAGE":
      let setLocalStorage = { ...state.localStorage };
      setLocalStorage[action.data.name] = action.data.data;
      return { ...state, localStorage: setLocalStorage };
    case "GET_LOCAL_STORAGE":
      var getLocalStorage = { ...state.localStorage };
      getLocalStorage[action.data.name] = action.data.data;
      return { ...state, localStorage: getLocalStorage };
    case "SET_SOCKET_ID":
      return { ...state, socketId: action.id, connected: action.id === null ? false : true, connection: action.id === null ? [] : state.connection };
    case "SET_CONNECTIONS":
      return { ...state, connection: action.data };
    case "SET_ROOM":
      return { ...state, room: action.data };
    case "SET_SCANNING":
      return { ...state, scanning: action.data };
    default:
      return state;
  }
};

export const data = init_state;
export default reducer;
