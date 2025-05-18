import express from "express";
import { Server } from "socket.io";
import * as http from "http";
import * as mediasoup from "mediasoup";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
const transports: mediasoup.types.WebRtcTransport[] = [];
const producers: mediasoup.types.Producer[] = [];
const consumers: mediasoup.types.Consumer[] = [];

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {},
  },
];

(async () => {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({ mediaCodecs });
})();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("get-rtpCapabilities", (_, callback) => {
    console.log("router.rtpCapabilities: ", router.rtpCapabilities);
    callback({ rtpCapabilities: router.rtpCapabilities });
  });

  socket.on("create-transport", async (_, callback) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: "127.0.0.1", announcedIp: undefined }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transports.push(transport);

    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });

    socket.on("connect-transport", async ({ dtlsParameters }) => {
      await transport.connect({ dtlsParameters });
    });

    socket.on("produce", async ({ kind, rtpParameters }, cb) => {
      const producer = await transport.produce({ kind, rtpParameters });
      producers.push(producer);
      cb({ id: producer.id });
    });

    socket.on("consume", async ({ rtpCapabilities }, cb) => {
      const producer = producers[0];
      if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        return;
      }

      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: false,
      });

      consumers.push(consumer);
      cb({
        id: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });
  });
});

server.listen(3001, () => console.log("Server running on port 3001"));
