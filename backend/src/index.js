"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var socket_io_1 = require("socket.io");
var http = require("http");
var mediasoup = require("mediasoup");
var app = (0, express_1.default)();
var server = http.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: { origin: '*' },
});
var worker;
var router;
var transports = [];
var producers = [];
var consumers = [];
var mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {},
    }
];
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, mediasoup.createWorker()];
            case 1:
                worker = _a.sent();
                return [4 /*yield*/, worker.createRouter({ mediaCodecs: mediaCodecs })];
            case 2:
                router = _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
io.on('connection', function (socket) {
    console.log('Client connected');
    socket.on('create-transport', function (_, callback) { return __awaiter(void 0, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, router.createWebRtcTransport({
                        listenIps: [{ ip: '0.0.0.0', announcedIp: null }],
                        enableUdp: true,
                        enableTcp: true,
                        preferUdp: true,
                    })];
                case 1:
                    transport = _a.sent();
                    transports.push(transport);
                    callback({
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    });
                    socket.on('connect-transport', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var dtlsParameters = _b.dtlsParameters;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, transport.connect({ dtlsParameters: dtlsParameters })];
                                case 1:
                                    _c.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    socket.on('produce', function (_a, cb_1) { return __awaiter(void 0, [_a, cb_1], void 0, function (_b, cb) {
                        var producer;
                        var kind = _b.kind, rtpParameters = _b.rtpParameters;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, transport.produce({ kind: kind, rtpParameters: rtpParameters })];
                                case 1:
                                    producer = _c.sent();
                                    producers.push(producer);
                                    cb({ id: producer.id });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    socket.on('consume', function (_a, cb_1) { return __awaiter(void 0, [_a, cb_1], void 0, function (_b, cb) {
                        var producer, consumer;
                        var rtpCapabilities = _b.rtpCapabilities;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    producer = producers[0];
                                    if (!router.canConsume({ producerId: producer.id, rtpCapabilities: rtpCapabilities })) {
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, transport.consume({
                                            producerId: producer.id,
                                            rtpCapabilities: rtpCapabilities,
                                            paused: false,
                                        })];
                                case 1:
                                    consumer = _c.sent();
                                    consumers.push(consumer);
                                    cb({
                                        id: consumer.id,
                                        producerId: producer.id,
                                        kind: consumer.kind,
                                        rtpParameters: consumer.rtpParameters,
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    }); });
});
server.listen(3001, function () { return console.log('Server running on port 3001'); });
