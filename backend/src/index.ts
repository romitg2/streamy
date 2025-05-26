import express from "express";
import http from "http";
import { Server } from "socket.io";
import { mediaCodecs } from "./codecs/mediacodecs.js";
import mediasoup from "mediasoup";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

const producerTransports: mediasoup.types.WebRtcTransport[] = [];
const consumerTransports: mediasoup.types.WebRtcTransport[] = [];

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({ mediaCodecs });
})();

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.emit("message", "Welcome to Socket.IO!");

  socket.on("get-rtp-capabilities", (callback) => {
    if (router) {
      callback({ success: true, data: router.rtpCapabilities });
    } else {
      callback({ success: false, error: "Router not ready yet" });
    }
  });

  socket.on('create-send-transport', async (callback) => {
    if (router) {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: '127.0.0.1', announcedIp: undefined }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      transport.on('dtlsstatechange', (dtlsState) => {
        if(dtlsState == 'closed') {
            transport.close();
        }
      })

      producerTransports.push(transport);

      callback({ success: true, data: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      } });
    } else {
      callback({ success: false, error: "Router not ready yet" });
    }
  })

  socket.on("connect-transport", async ({dtlsParameters, transportId}, callback) => {
    const transport = producerTransports.find((t) => t.id == transportId);
    if (transport) {
      try {
        await transport.connect({ dtlsParameters });
        callback({ success: true });
      } catch (err) {
        callback({ success: false, error: err });
      }
    } else {
      callback({ success: false, error: "Transport not found" });
    }
  })

  socket.on("produce-transport", async ({kind, rtpParameters, transportId}, callback) => {
    const transport = producerTransports.find((t) => t.id == transportId);
    if (transport) {
      try {
        const producer = await transport.produce({ kind, rtpParameters });
        callback({ success: true, data: producer });
      } catch (err) {
        callback({ success: false, error: err });
      }
    } else {
      callback({ success: false, error: "Transport not found" });
    }
  })

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

server.listen(3030, () => {
  console.log("listening on *:3030");
});
