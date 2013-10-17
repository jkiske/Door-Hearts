var _und = require("underscore");
var io = require("socket.io")
var http = require('http');
var fs = require('fs');
var $ = require('jquery');
var express = require('express');

var _deck = require("./deck");

var _player = require("./player");
var _table = require("./table");


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
var tables = {};

var waiting_room = 'waiting room';

socket.sockets.on('connection', function (client) {
    //When someone connects put them in the waiting room
    client.join(waiting_room);

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

		player.cards = cards;
		console.log("Added cards to player " + player.name);

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

    client.on('newTable', function() {
	var table = new _table.Table();
	client.leave(waiting_room);
	client.join(table.id);
	
	tables[table.id] = table;
	cqlient.emit("joinTable", JSON.stringify(table));
	socket.sockets.in(waiting_room).emit("addTableToTable", JSON.stringify(table))
	console.log("Made new table " + table.id);
    });

    client.on('sit', function(name, table_id, position) {
	var player = new _player.Player(name, client.id);
	player.position = position;
	player.table = table_id;
	
	if (table_id in tables) {
	    var table = tables[table_id];
	    table.players[player.id] =  player;
	} else {
	    console.log("No table with id " + table_id);
	}
    });
});
