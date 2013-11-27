var _und = require("underscore");
var _deck = require("./deck");

var Table = function() {
    //Name to player object
    var players = {};
    //Position to player name
    var positions = {
        "N": null,
        "S": null,
        "E": null,
        "W": null
    };
    var traded_cards = {
        "N": null,
        "S": null,
        "E": null,
        "W": null
    };
    var state = "waiting";
    var turn = "";
    var id = _und.uniqueId("tableid_");
    var round = 0;
    var deck = new _deck.Deck();
    deck.shuffle();

    /* Returns the table with 'safe' values */

    function safe() {
        var players = _und.values(this.players);
        var player_names = _und.pluck(players, "name");

        return {
            players: player_names,
            round: this.round,
            id: this.id,
            state: this.state,
            turn: this.turn
        };
    }

    function firstOpenPosition() {
        for (var pos in this.positions) {
            if (this.positions[pos] === null)
                return pos;
        }
        return undefined;
    }

    function readyToTrade() {
        var trade_values = _und.values(traded_cards);
        //removes all elements that are null
        //TODO: make sure the table in in the trading phase
        return this.state == 'trading' && _und.compact(trade_values).length == 4;
    }

    function resetTrade() {
        traded_cards = {
            "N": null,
            "S": null,
            "E": null,
            "W": null
        };
    }

    function tradeMap() {
        switch (this.round % 4) {
            case 1:
                //left
                return {
                    "N": "E",
                    "S": "W",
                    "E": "S",
                    "W": "N"
                };
            case 2:
                //right
                return {
                    "N": "W",
                    "S": "E",
                    "E": "N",
                    "W": "S"
                };
            case 3:
                //across
                return {
                    "N": "S",
                    "S": "N",
                    "E": "W",
                    "W": "E"
                };
            case 0:
                //error
                return "Do not trade on this round";
        }
    }

    return {
        players: players,
        id: id,
        round: round,
        turn: turn,
        deck: deck,
        positions: positions,
        traded_cards: traded_cards,
        state: state,
        safe: safe,
        firstOpenPosition: firstOpenPosition,
        readyToTrade: readyToTrade,
        resetTrade: resetTrade,
        tradeMap: tradeMap
    };
};

module.exports.Table = Table;