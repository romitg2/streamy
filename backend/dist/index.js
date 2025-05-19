var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { Server } from "socket.io";
import * as http from "http";
import * as mediasoup from "mediasoup";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});
let worker;
let router;
const transports = [];
const producers = [];
const consumers = [];
setInterval(() => {
    console.log("transports: ", transports.length);
    console.log("producers: ", producers.length);
    console.log("consumers: ", consumers.length);
}, 5000);
const mediaCodecs = [
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
(() => __awaiter(void 0, void 0, void 0, function* () {
    worker = yield mediasoup.createWorker();
    router = yield worker.createRouter({ mediaCodecs });
}))();
io.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("get-rtpCapabilities", (_, callback) => {
        callback({ rtpCapabilities: router.rtpCapabilities });
    });
    socket.on("create-transport", (_, callback) => __awaiter(void 0, void 0, void 0, function* () {
        const transport = yield router.createWebRtcTransport({
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
        socket.on("connect-transport", (_a) => __awaiter(void 0, [_a], void 0, function* ({ dtlsParameters }) {
            yield transport.connect({ dtlsParameters });
        }));
        socket.on("produce", (_a, cb_1) => __awaiter(void 0, [_a, cb_1], void 0, function* ({ kind, rtpParameters }, cb) {
            console.log("produce: ", kind, rtpParameters);
            const producer = yield transport.produce({ kind, rtpParameters });
            producers.push(producer);
            cb({ id: producer.id });
        }));
        socket.on("consume", (_a, cb_1) => __awaiter(void 0, [_a, cb_1], void 0, function* ({ rtpCapabilities }, cb) {
            const producer = producers[0];
            if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                return;
            }
            const consumer = yield transport.consume({
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
        }));
    }));
});
server.listen(3001, () => console.log("Server running on port 3001"));
