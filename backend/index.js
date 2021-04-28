const http = require('http');
const fs = require('fs');
var express = require('express');
var cors = require('cors');

var app = express()

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));


var offers = [{
        "offerID": 1,
        "offer": { "offer": 22.45 }
    },
    {
        "offerID": 2,
        "offer": { "offer": 22.45 }
    },
    {
        "offerID": 3,
        "offer": { "offer": 22.45 }
    },
    {
        "offerID": 4,
        "offer": { "offer": 22.45 }
    }
];




app.post("/addNewOffer", (req, res) => {
    var offer = req.body.offer;
    console.log(req.body)

    offers.push({
        offerID: offers.length + 1,
        offer: offer
    });

    console.log("New WebRTC Offer added with id " + JSON.stringify(offers[offers.length - 1].offerID));
    res.setHeader('Access-Control-Allow-Origin', "*");
    res.send({
        status: "200",
        offerID: offers[offers.length - 1].offerID
    });
})

app.get("/acceptOffer", (req, res) => {
    var offerID = req.query.offerID;
    res.setHeader("Access-Control-Allow-Origin", "*");
    var offer = offers.find(offer => offer.offerID = offerID);
    console.log("Requested new WebRTC Offer with id " + offer.offerID);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send({
        offerID: offer.offerID,
        offer: offer.offer
    });
})


app.get("/getAllOffers", (req, res) => {
    res.send(offers);
})

app.listen(8085);