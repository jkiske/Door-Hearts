var _und = require("underscore");
var io = require("socket.io").listen(1222);
var http = require('http');

var game = require("./game");

 

io.set("log level", 1);

io.sockets.on('connection', function (client) {
	client.on('addPlayer', function(player){
		players[client.id] = player;
		console.log("Player " + player + "with id: " + client.id + "has connected.");
		console.log(Object.size(players));
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
		//reset pack
		pack = game.shufflePack(game.createPack());
	    });
 
	client.on('dealCards', function(){
		var cards = game.draw(pack, 5, "", true);
		client.emit('showCards', cards);
		socket.sockets.emit("remainingCards", pack.length)
		    });
    });

 
var players = {};
var start = false;
var deck = game.shuffleDeck(game.createDeck());