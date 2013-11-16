var _und = require("underscore");
var fs = require('fs');
var $ = require('jquery');

var http = require('http');
var express = require('express');
var Primus = require("primus.io");

var _deck = require("./deck");
var _player = require("./player");
var _table = require("./table");

// This serves static content on port 8888
var app = express();

app.use(express.static(__dirname + '/assets'));

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/assets/index.html');
});

var server = http.createServer(app);

// This is where we initialize the websocket for javascript callbacks
var primus = new Primus(server, {
    transformer: 'sockjs',
    parser: 'JSON'
});

var port = 8888;
server.listen(port);

var players = {};
var tables = {};

var waiting_room = 'waiting_room';

primus.on('connection', function(client) {
    //When someone connects put them in the waiting room
    client.join(waiting_room);

    console.log("Client joined: " + client.id);
    //Let the new client know which tables are available
    _und.each(_und.values(tables),
        function(table) {
            client.send("addTableRow", table.safe());
        }
    );

    function joinTable(table_id, playerName) {
        var all_names = _und.pluck(_und.values(players), "name");
        if (_und.contains(all_names, playerName)) {
            //Don't allow duplicate players
            client.send("duplicateName", playerName);
            return false;
        } else {
            if (table_id in tables) {
                var player = makePlayer(client, playerName);
                var table = tables[table_id];

                player.table = table.id;
                table.players[playerName] = player;

                player.position = table.firstOpenPosition();
                table.positions[player.position] = player.name;

                client.join(table.id);
                client.leave(waiting_room);

                //Tell this client to join the table
                client.send("joinTable", table.safe());

                updatePlayerPositions(table);
                if (_und.size(table.players) == 4) {
                    primus.room(table.id).send("startGame");
                    table.round++;
                    table.state = "trading";
                }
                return true;
            }
        }
        return false;

    }

    function updatePlayerPositions(table) {
        // Put all of the other players into a map - position:{name: ?, score: ?}
        var table_players = _und.values(table.players);
        var other_pos = _und.filterAndIndexBy(table_players, "position", ["name", "score"]);

        //Tell all the clients at the table that there is a new player
        var clients = primus.room(table.id).clients();
        _und.each(clients, function(id) {
            //Emit the client his position
            var client_pos = players[id].position;
            primus.connections[id].send("updatePositions", client_pos, other_pos);
        });

        //Tell all the clients in the waiting room that there is an update
        primus.room(waiting_room).send("updateTableRow", table.safe());
    }

    client.on('joinTable', joinTable);

    client.on('newTable', function(playerName) {
        var table = makeTable();
        //Tell all the clients in the waiting room that there is an update
        primus.room(waiting_room).send("addTableRow", table.safe());

        //Check to see if we successfully joined
        var did_join = joinTable(table.id, playerName);
        if (!did_join) {
            primus.room(waiting_room).send("removeTableRow", table.id);
            //Delete the table if there was an error
            delete tables[table.id];
        }
    });

    // Individual table logic
    client.on('dealCards', function() {
        var player = players[client.id];
        var table = tables[player.table];
        var deck = table.deck;

        if (_und.size(player.cards) < 13) {
            var cards = deck.draw(13, "", true);

            player.addCards(cards);
            client.send('showCards', cards);
        } else {
            console.log("Player " + player.name + " already has 13 cards");
        }
    });

    //Wait for all players to submit cards to trade
    client.on('passCards', function(cards) {
        var player = players[client.id];
        var position = player.position;
        var table = tables[player.table];
        table.traded_cards[position] = cards;

        if (table.readyToTrade()) {
            for (pos in table.traded_cards) {
                var cards = table.traded_cards[pos];

                var player_name = table.positions[pos];
                var player = table.players[player_name];
                player.removeCards(cards);

                //TODO: Make sure we do not trade on the 4th round
                var trade_map = table.tradeMap();
                var trade_player_pos = trade_map[pos];
                var trade_player_name = table.positions[trade_player_pos];
                var trade_player = table.players[trade_player_name];
                trade_player.addCards(cards);
            }
            for (player in table.players) {
                //Re-deal the cards and update round state
            }
        }
    });

    //Disconnect
    primus.on('disconnection', function(client) {
        if (client.id in players) {
            var player = players[client.id];
            delete players[client.id];

            var table = tables[player.table];
            if (table !== undefined) {
                table.positions[player.position] = null;

                delete table.players[player.name];
                client.leave(table.id);

                // If that was the last player in the room, delete the room
                if (_und.size(table.players) == 0) {
                    delete tables[table.id];
                    primus.room(waiting_room).send("removeTableRow", table.id);
                } else {
                    //Otherwise, remove the username from the row
                    primus.room(waiting_room).send("updateTableRow", table.safe());
                    //And let everone in the room know that person left
                    updatePlayerPositions(table);
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