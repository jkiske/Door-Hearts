require("newrelic");
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

var players = {};
var tables = {};

var waiting_room = 'waiting room';

socket.sockets.on('connection', function (client) {
    //When someone connects put them in the waiting room
    client.join(waiting_room);

    //Let the new client know which tables are available
    _und.each(_und.values(tables), 
	      function(table) {
		  client.emit("addTableRow", JSON.stringify(table));
	      }
	     );


    // Global table logic
    function joinTable(client, table_id) {
        var table = tables[table_id];
	var player = players[client.id];

	//Back out if we fail to find the table or player
	if (player === undefined || table === undefined)
	    return;

        client.join(table_id);
	client.leave(waiting_room);

	//Tell this client to join the table
        client.emit("joinTable", JSON.stringify(table));
	//Tell all the clients in the room that there is a new player
	var clients = socket.sockets.clients(table_id);

	// Put all of the other players into a map - pos:{name: ?, score: ?}
	var table_players = _und.values(table.players);
	var other_pos = {};
	// Iterate through the table's players and put them in the map
	_und.each(table_players, function(player) {
	    other_pos[player.position] = _und.pick(player, "name", "score");
	});
	console.log(JSON.stringify(other_pos));

	_und.each(clients, function(c) {
	    //Send the client his position
	    var client_pos = players[c.id].position;
	    c.emit("updatePositions", 
		   JSON.stringify(client_pos),
		   JSON.stringify(other_pos));
	});
    }
    
    //Creates a new player and associates 
    function makePlayer(client, player) {
	var playerObj = new _player.Player(player, client.id);
	players[client.id] = playerObj;
	return playerObj;
    }

    function makeTable() {
	var table = new _table.Table();
	var deck = new _deck.Deck();
	deck.shuffle();
	table.deck = deck;

	// Add the table to the list of global tables
	tables[table.id] = table;
	
	return table;
    }
    
    function firstOpenPosition(table) {
	for (var pos in table.positions) {
	    if (table.positions[pos] == null)
		return pos;
	}
	return undefined;
    }
    
    client.on('joinTable', function(table_id, playerName) {
	if (table_id in tables) {
	    var player = makePlayer(client, playerName);
	    var table = tables[table_id];

	    player.table = table.id;
	    table.players[playerName] = player;

	    player.position = firstOpenPosition(table);
	    table.positions[player.position] = player.name;

            joinTable(client, table.id);

	    socket.sockets.in(waiting_room).emit("updateTableRow", JSON.stringify(table));
	}
     });
 
    client.on('newTable', function(playerName) {
	var player = makePlayer(client, playerName);
	var table = makeTable();

	table.players[playerName] = player;
	player.table = table.id;

	player.position = firstOpenPosition(table);
	table.positions[player.position] = player.name;

	joinTable(client, table.id);

	socket.sockets.in(waiting_room).emit("addTableRow", JSON.stringify(table))
    });
    
    // Individual table logic
    client.on('dealCards', function(){
	var player = players[client.id];
	var table = tables[player.table];
	var deck = table.deck;

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
    });
    
    //Disconnect
    client.on('disconnect', function(){
	if (client.id in players) {
	    var player = players[client.id];
	    delete players[client.id];

	    var table = tables[player.table];
	    if (table !== undefined) {
		table.positions[player.position] = null;

		delete table.players[player.name];

		// If that was the last player in the room, delete the room
		if (_und.size(table.players) == 0) {
		    delete tables[table.id];
		    socket.sockets.in(waiting_room).emit("removeTableRow", table.id);
		} else {
		    //Otherwise, just remove the username from the row
		    socket.sockets.in(waiting_room).emit("updateTableRow", JSON.stringify(table));
		}
	    }
	}
    });
    

});
