export const getAddress = (address) => {
  return (dispatch) => {
    dispatch({
      type: "STORE_ADDRESS",
      data: address,
    });
  };
};

export const getSigner = (signer) => {
  return (dispatch) => {
    dispatch({
      type: "STORE_SIGNER",
      data: signer,
    });
  };
};

export const setOpponent = (address) => {
  return (dispatch) => {
    dispatch({
      type: "GET_STARTING_CHAT",
      data: address,
    });
  };
};

export const getOpponents = (opponents) => {
  opponents = opponents.slice().sort((a, b) => parseInt(b.Messages.MessageTimestamp._hex) - parseInt(a.Messages.MessageTimestamp._hex));
  return (dispatch) => {
    dispatch({
      type: "STORE_MESSAGE",
      data: opponents,
    });
  };
};

export const getStorage = (storage) => {
  return (dispatch) => {
    dispatch({
      type: "STORE_STORAGE",
      data: storage,
    });
  };
};

export const autoUpdater = (data) => {
  return (dispatch) => {
    dispatch({
      type: "AUTO_UPDATER",
      data: data,
    });
  };
};

export const setLocalStorage = (name, data) => { 
  localStorage.setItem(name, JSON.stringify(data));

  return (dispatch) => {
    dispatch({
      type:"SET_LOCAL_STORAGE",
      data: {
        name,
        data,
      },
    })
  }
}

export const getLocalStorage = (name) => {
  return (dispatch) => {
    dispatch({
      type:"GET_LOCAL_STORAGE",
      data: {
        name,
        data: JSON.parse(localStorage.getItem(name))
      }
    })
  }
}

export const setSocketId = (id) => {
  return (dispatch) => {
    dispatch({
      type: "SET_SOCKET_ID",
      id
    })
  }
}

export const setConnection = (connections) => {
  return (dispatch) => {
    dispatch({
      type: "SET_CONNECTIONS",
      data: connections
    })
  }
}