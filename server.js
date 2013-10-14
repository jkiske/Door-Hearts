var _und = require("underscore");
var io = require("socket.io")
var http = require('http');
var fs = require('fs');
var $ = require('jquery');
var express = require('express');

var _deck = require("./deck");


// This serves static content on port 8888
var app = express();
var server = http.createServer(app);
var port = process.env.PORT || 5000;

server.listen(port);

app.use(express.static(__dirname + '/assets'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/assets/index.html');
});


// This is where we initialize the websocket for javascript callbacks
socket = io.listen(server);
socket.set("log level", 1);

var deck = new _deck.Deck();
deck.shuffle();

var players = {};
var start = false;

socket.sockets.on('connection', function (client) {
    client.on('addPlayer', function(player){
	var playerObj = new _player.Player(player, client.id);
	players[client.id] = playerObj;
	console.log("Player " + playerObj.name + " with id: " + playerObj.id  + "has connected.");
	console.log("Total Players: " + _und.size(players));
    });
    
    client.on('disconnect', function(){
	if (client.id in players) {
	    var player = players[client.id];
	    console.log("Player " + player.name + " with id: " + player.id  + "has disconnected.");
	    delete players[client.id];
	    console.log("Total Players: " + _und.size(players));
	}
    });
    
    client.on('dealCards', function(){
	if (client.id in players) {
	    var player = players[client.id];
	    if (_und.size(player.cards) < 13) {
		var cards = deck.draw(13, "", true);
		cards = _und.sortBy(cards, function(card) {
		    return deck.sortValue(card);
		});

		players[client.id].cards = cards;
		console.log("Added cards to player " + players[client.id].name);

		client.emit('showCards', JSON.stringify(cards));
		socket.sockets.emit("remainingCards", deck.cards.length)
	    } else {
		console.log("Player " + player.name + " already has 13 cards");
	    }
	}
    });
    
    client.on('newDeck', function() {
	deck = new _deck.Deck();
	deck.shuffle();
	socket.sockets.emit("remainingCards", deck.cards.length);
	
    });
});
