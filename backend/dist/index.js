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
let worker;
let router;
(() => __awaiter(void 0, void 0, void 0, function* () {
    worker = yield mediasoup.createWorker();
    router = yield worker.createRouter({ mediaCodecs });
}))();
io.on("connection", (socket) => {
    console.log("a user connected:", socket.id);
    socket.emit("message", "Welcome to Socket.IO!");
    socket.on("get-rtp-capabilities", (callback) => {
        if (router) {
            callback({ success: true, data: router.rtpCapabilities });
        }
        else {
            callback({ success: false, error: "Router not ready yet" });
        }
    });
    socket.on('create-transport', (callback) => __awaiter(void 0, void 0, void 0, function* () {
        if (router) {
            const transport = yield router.createWebRtcTransport({
                listenIps: [{ ip: '127.0.0.1', announcedIp: undefined }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            });
            callback({ success: true, data: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                } });
        }
        else {
            callback({ success: false, error: "Router not ready yet" });
        }
    }));
    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
    });
});
server.listen(3030, () => {
    console.log("listening on *:3030");
});
