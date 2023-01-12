const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const { create } = require("ipfs-http-client");
const fs = require("fs");
const dotenv = require("dotenv");
const http = require("http");
const server = http.createServer(app);
const socketIo = require("socket.io");

const originAllowed = ["http://localhost:3000"];

const io = socketIo(server, {
  cors: {
    origin: originAllowed,
  },
});
dotenv.config();

app.use(
  cors({
    origin: function(origin, callbacks) {
      if (!origin) return callbacks(null, true);

      if (originAllowed.indexOf(origin) === -1) {
        return callback(
          new Error("The CORS policy for this site is not allowed to access")
        );
      }

      return callback(null, true);
    },
  })
);

app.io = io;

const projectID = process.env.projectID;
const projectSecret = process.env.projectSecret;
const auth =
  "Basic " + Buffer.from(projectID + ":" + projectSecret).toString("base64");

const client = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: auth,
  },
});

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads");
  },
  filename: function(req, file, cb) {
    cb(null, `${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post("/multifiles", upload.array("files"), async (req, res) => {
  const files = req.files;

  var hash = [];

  for (let i = 0; i < files.length; i++) {
    const ipfs = await client.add({
      path: `${files[i].originalname}`,
      content: fs.createReadStream(`uploads/${files[i].originalname}`),
    });

    fs.unlinkSync(`uploads/${files[i].originalname}`);

    hash.push(`${process.env.infuraDomain}/${ipfs.cid}`);
  }

  res.send({
    result: true,
    hash,
  });
});

let requestList = [];

io.on("connection", (socket) => {
  console.log(`new connection: ${socket.id}`);

  socket.on("subscribe", (data) => {
    if (typeof data !== "object") socket.disconnect();
    if (
      // !data.address ||
      !data.socketId ||
      !io.sockets.sockets.get(data.socketId)
    ) {
      socket.disconnect();
      return false;
    }

    io.to(data.socketId).emit("subscribe", {
      address: data.address,
      socketId: socket.id,
      ipAddress: socket.request.connection.remoteAddress,
      userAgent: socket.handshake.headers["user-agent"],
    });

    requestList.push(socket.id);
  });

  socket.on("accept", (data) => {
    if (!io.sockets.sockets.get(data.socketId))
      if (
        !requestList.includes(data.socketId) ||
        Array.from(io.sockets.sockets.get(data.socketId).rooms).length !== 1
      )
        return false;

    requestList.splice(requestList.indexOf(data.socketId), 1);

    room = socket.id;
    console.log(room);
    socket.join(`room-${socket.id}`);
    io.sockets.sockets.get(data.socketId).join(`room-${socket.id}`);

    io.to(data.socketId).emit("accepted", {
      socketId: socket.id,
      ipAddress: socket.request.connection.remoteAddress,
      userAgent: socket.handshake.headers["user-agent"],
    });
  });

  socket.on("reject", (data) => {
    if (!requestList.includes(data.socketId)) return false;

    requestList.splice(requestList.indexOf(data.socketId), 1);

    io.to(data.socketId).emit("rejected", { socketId: socket.id });
    io.sockets.sockets.get(data.socketId).disconnect();
  });

  socket.on("sync", (data) => {
    if (typeof data !== "object") return false;
    if (!data.destination || !data.storageName || !data.storageContent)
      return false;
    if (typeof data.storageContent !== "object") return false;

    const syncData = { ...data };
    delete syncData.destination;

    io.to(`room-${data.destination}`).emit("sync", syncData);
  });

  socket.on("disconnect", () => {
    Object.entries(Object.fromEntries(io.sockets.adapter.rooms)).forEach(
      (room) => {
        if (room[0].substring(0, 5) === "room-")
          if (Array.from(room[1]).length === 1) {
            io.sockets.sockets.get(Array.from(room[1])[0]).disconnect();
          }
      }
    );

    console.log(`socket disconnected: ${socket.id}`);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`this server running on port ${process.env.PORT}`);
});
