var _und = require("underscore");
var io = require("socket.io")
var http = require('http');
var fs = require('fs');
var $ = require('jquery');
var express = require('express');

var game = require("./Deck");


// This serves static content on port 8888
var app = express()
var server = http.createServer(app)
server.listen(8888);
app.use(express.static(__dirname + '/assets'));


// This is where we initialize the websocket for javascript callbacks
socket = io.listen(8080);
socket.set("log level", 1);

var deck = game.Deck
deck.shuffle();

var players = {};
var start = false;

socket.sockets.on('connection', function (client) {
    client.on('addPlayer', function(player){
	players[client.id] = player;
	console.log("Player " + player + "with id: " + client.id + "has connected.");
	console.log(_und.size(players));
	for(var key in players) {
	    console.log("Players: " + key + ": " + players[key]);
	}
    });
    
    client.on('disconnect', function(){
	console.log("Player with id: " + client.id + "has disconnected");
	delete players[client.id];
	for(var key in players) {
	    console.log("Remaining players: " + key + ": " + players[key]);
	}
	//reset deck
	//deck = Deck.shuffle()
    });
    
    client.on('dealCards', function(){
	var cards = deck.draw(13, "", true);
	client.emit('showCards', JSON.stringify(cards));
	socket.sockets.emit("remainingCards", deck.cards.length)
    });
});



