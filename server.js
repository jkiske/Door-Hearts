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
		  client.emit("addTableRow", JSON.stringify(table.safe()));
	      }
	     );

    function joinTable(table_id, playerName) {
	var all_names = _und.pluck(_und.values(players), "name");
	if (_und.contains(all_names, playerName)) {
	    //Don't allow duplicate players
	    client.emit("duplicateName", playerName);
	    return false;
	} else {
	    if (table_id in tables) {
		var player = makePlayer(client, playerName);
		var table = tables[table_id];

		player.table = table.id;
		table.players[playerName] = player;

		player.position = table.firstOpenPosition();
		table.positions[player.position] = player.name;

		notifyUsersOfJoin(player, table);
		return true;
	    }
	}
	return false;
    }

    function notifyUsersOfJoin(player, table) {

	client.join(table.id);
	client.leave(waiting_room);

	//Tell this client to join the table
        client.emit("joinTable", JSON.stringify(table.safe()));

	// Put all of the other players into a map - position:{name: ?, score: ?}
	var table_players = _und.values(table.players);
	var other_pos = _und.filterAndIndexBy(table_players, "position", ["name", "score"]);

	//Tell all the clients at the table that there is a new player
	var clients = socket.sockets.clients(table.id);
	_und.each(clients, function(c) {
	    //Send the client his position
	    var client_pos = players[c.id].position;
	    c.emit("updatePositions", JSON.stringify(client_pos),
		                      JSON.stringify(other_pos));
	});

	//Tell all the clients in the waiting room that there is an update
	socket.sockets.in(waiting_room).emit("updateTableRow",
					     JSON.stringify(table.safe()));
    }

    client.on('joinTable', joinTable);

    client.on('newTable', function(playerName) {
	var table = makeTable();
	//Tell all the clients in the waiting room that there is an update
	socket.sockets.in(waiting_room).emit("addTableRow",
					     JSON.stringify(table.safe()));

	//Check to see if we successfully joined
	var did_join = joinTable(table.id, playerName);
	if (!did_join) {
	    socket.sockets.in(waiting_room).emit("removeTableRow", table.id);
	    //Delete the table if there was an error
	    delete tables[table.id];
	}
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
		    socket.sockets.in(waiting_room).emit("updateTableRow",
							 JSON.stringify(table.safe()));
		}
	    }
	}
    });


});


/**
 * This function takes a list of the same objects, reindexes by an
 * index, and keeps only certain properties of the object. Index must
 * be unique for each object.
 *
 * Usage:
 *
 * var obj = {Jeff: {id: 1, pos: 'N', foo:'foo', other: 1},
 *            Michael: {id: 2, pos: 'S', foo:'bar', other: 2}}
 *
 * objIndexBy(obj, "id", ["pos", "foo"])
 * > {1: {pos: N, foo: foo}, 2: {pos: S, foo: bar}}
 */
_und.mixin({
    filterAndIndexBy: function(obj, index, filter) {
	// Put all of the other players into a map - pos:{name: ?, score: ?}
	var vals = _und.values(obj);
	var newObj = {};
	// Iterate through the table's players and put them in the map
	_und.each(vals, function(val) {
	    var args = _und.union(val, filter);
	    newObj[val[index]] = _und.pick.apply(this, args);
	});
	return newObj;
    }
});

/**
 * Simple method to create and associate a player with an id
 */
function makePlayer(client, name) {
    var player = new _player.Player(name, client.id);
    // Add the player to the list of global players
    players[client.id] = player;
    return player;
}

/**
 * Simple method to create and associate a table with an id
 */
function makeTable() {
    var table = new _table.Table();
    // Add the table to the list of global tables
    tables[table.id] = table;
    return table;
}
