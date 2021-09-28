const https = require('https');
var http = require('http');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
var express = require('express');
var cors = require('cors');
const fs = require('fs');
const WebSocket = require('ws');
var events = require('events');
const url = require('url');
const querystring = require('querystring');

var app = express();
app.use("/", express.static('/websites/webrtc/index.html'));

var globalEventEmitter = new events.EventEmitter();
const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

const server = http.createServer();


var offers = [];

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

server.on('request', app)

/*
app.get('/WebRTC_preview', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept');
    res.sendFile("/root/websites/webrtc/index.html");
});
*/

app.get('/', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept');
    res.sendFile("/websites/webrtc/index.html");
});


app.get("/ping" , (req,res) => {
    res.send("Ping ok");
});

/*
app.get("/roomclimate", (req, res) => {
    proxy.web(req, res, { target: 'https://wiredless.io:8081/' });
})
*/


//add new Offer

wss1.on('connection', function connection(ws, req) {
    const ip = req.socket.remoteAddress;
    const port = req.socket.remotePort;
    console.log("Client connected with IP %s:%s" + ip, port);

    ws.on('message', message => {
        var offer = JSON.parse(message);
        console.log(offer);

        offers.push({
            offerID: offers.length + 1,
            offer: offer
        });

        let id = offers[offers.length - 1].offerID;

        globalEventEmitter.addListener("sendBackMaster" + String(id), msg => {
            console.log("Sending back to master")
            ws.send(msg)
            offers.splice(id - 1, 1)
        })

        console.log("New WebRTC Offer added with id " + JSON.stringify(offers[offers.length - 1].offerID));
        ws.send(JSON.stringify({
            status: "200",
            offerID: offers[offers.length - 1].offerID
        }));
    });

    ws.on('close', message => {
        console.log("Connection to client with IP: %s:%s lost.", ip, port);
    });
});

//accept Offer

wss2.on('connection', function connection(ws, req) {
    const ip = req.socket.remoteAddress;
    const port = req.socket.remotePort;
    let query = querystring.parse(url.parse(req.url).query);
    try {

        if (query.id != "null") {
            console.log("Client connected with IP " + ip);

            ws.on('message', message => {
                message1 = message;
                globalEventEmitter.emit("sendBackMaster" + String(query.id), message)
            });

            ws.on('close', message => {
                console.log("Connection to client with IP: %s:%s lost.", ip, port);
            });

            var offer = offers.find(of => of.offerID == query.id);

            ws.send(JSON.stringify({
                offerID: offer.offerID,
                offer: offer.offer
            }));
        }


    } catch (e) {}

});

//URL Paths deklarieren 

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    console.log("A new offer cam in")

    if (pathname === '/addNewOffer') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else if (pathname === '/acceptOffer') {
        wss2.handleUpgrade(request, socket, head, function done(ws) {
            wss2.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(80);