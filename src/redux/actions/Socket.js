import io from "socket.io-client";

import { reactStore as store } from "../..";
import { API } from "../../constants/API";

let socket;

export const init = () => {
  if (socket && socket.connected) return true;
  socket = io.connect(API);

  socket.on("connect", () =>
    store.dispatch({ type: "SET_SOCKET_ID", id: socket.id })
  );

  socket.on("disconnect", () =>
    store.dispatch({ type: "SET_SOCKET_ID", id: null })
  );
};

export const subscribe = (socketId) => {
  if (!socket) return false;

  if (!socketId) {
    if (socket._callbacks.$subscribe) return true;

    socket.on("subscribe", (data) => {
      if (typeof data !== "object") return false;
      if (
        !data.socketId ||
        !data.ipAddress ||
        data.address.toLowerCase() !==
          store.getState().user.address.toLowerCase()
      )
        return false;
      if (
        store
          .getState()
          .user.connection.some((conn) => conn.socketId === data.socketId)
      )
        return false;

      const newConnection = [
        ...store.getState().user.connection,
        { ...data, connected: false },
      ];

      store.dispatch({ type: "SET_CONNECTIONS", data: newConnection });
    });
  } else {
    if (socket._callbacks.$subscribe) return true;

    store.dispatch({ type: "SET_SCANNING", data: true });

    socket.emit("subscribe", {
      address: store.getState().user.address,
      socketId,
    });

    socket.on("accepted", (data) => {
      if (typeof data !== "object") return false;
      if (!data.socketId) return false;

      const newConnection = [
        ...store.getState().user.connection,
        { ...data, connected: true },
      ];

      store.dispatch({ type: "SET_CONNECTIONS", data: newConnection });
      store.dispatch({ type: "SET_ROOM", data: data.socketId });
      store.dispatch({ type: "SET_SCANNING", data: false });
    });

    socket.on("rejected", (data) => {
      store.dispatch({ type: "SET_SCANNING", data: true });
    })
  }
};

export const newSubscriber = () => {
  if (!socket) return false;
  if (socket._callbacks.$newSubscribe) return true;

  socket.on("newSubscriber", (data) => {
    if (typeof data !== "object") return false;
    if (!data.socketId || !data.ipAddress) return false;
    if (
      store
        .getState()
        .user.connection.some((conn) => conn.socketId === data.socketId)
    )
      return false;

    const newConnection = [
      ...store.getState().user.connection,
      { ...data, connected: true },
    ];

    store.dispatch({ type: "SET_CONNECTIONS", data: newConnection });
  });
};

export const accept = (socketId) => {
  if (!socket) return false;

  const index = store
    .getState()
    .user.connection.findIndex((conn) => conn.socketId === socketId);

  const newConnection = [...store.getState().user.connection];
  newConnection[index].connected = true;

  store.dispatch({ type: "SET_CONNECTIONS", data: newConnection });
  store.dispatch({ type: "SET_ROOM", data: socket.id });

  socket.emit("accept", { socketId });

  return true;
};

export const reject = (socketId) => {
  if (!socket) return false;

  store.dispatch({
    type: "SET_CONNECTIONS",
    data: store
      .getState()
      .user.connection.filter((conn) => conn.socketId !== socketId),
  });

  socket.emit("reject", { socketId });

  return true;
};

export const sync = (storageName, storageContent) => {
  if (!socket) return false;

  if (storageName && storageContent) {
    socket.emit("sync", {
      destination: store.getState().user.room,
      storageName,
      storageContent,
    });

    return true;
  }

  if (socket._callbacks.$sync) return true;

  socket.on("sync", (data) => {
    if (typeof data !== "object") return false;
    if (!data.storageName || !data.storageContent) return false;
    if (
      store.getState().user.localStorage[data.storageName] ===
      data.storageContent
    )
      return false;

    store.dispatch({
      type: "SET_LOCAL_STORAGE",
      data: {
        name: data.storageName,
        data: data.storageContent,
      },
    });
    localStorage.setItem(data.storageName, JSON.stringify(data.storageContent));

    store.dispatch({
      type: "SET_LOCAL_STORAGE",
      data: {
        name: storageName,
        data: storageContent,
      },
    });
  });

  return true;
};
