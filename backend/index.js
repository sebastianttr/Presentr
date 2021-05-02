const http = require('http');
const https = require('https');
const fs = require('fs');
var express = require('express');
var cors = require('cors');
const WebSocket = require('ws');
var events = require('events');
const url = require('url');
const querystring = require('querystring');


var app = express();
var globalEventEmitter = new events.EventEmitter();

const server = https.createServer({
    cert: fs.readFileSync('ssl/certificate.crt'),
    key: fs.readFileSync('ssl/privateKey.key')
});

const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));



var offers = [];

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

});

//URL Paths deklarieren 

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

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

/*
app.get("/getAllOffers", (req, res) => {
    res.send(offers);
})
*/

app.listen(8085); //HTTP Server
server.listen(8086); //WebSocket Server