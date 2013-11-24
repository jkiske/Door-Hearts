var _und = require("underscore");
var _deck = require("./deck");

var Table = function() {
    var players = {};
    var positions = {
        "N": null,
        "S": null,
        "E": null,
        "W": null
    };
    var traded_cards = {"N": null, "S": null, "E": null, "W": null};
    var state = 'waiting';
    var id = _und.uniqueId('tableid_');
    var round = 0;
    var deck = new _deck.Deck();
    deck.shuffle();

    /* Returns the table with 'safe' values */

    function safe() {
        var players = _und.values(this.players);
        var player_names = _und.pluck(players, "name");

        var round = this.round;
        var id = this.id;
        return {
            players: player_names,
            round: round,
            id: id,
            state: state
        };
    }

    function firstOpenPosition() {
        for (var pos in this.positions) {
            if (this.positions[pos] == null)
                return pos;
        }
        return undefined;
    }

    function readyToTrade() {
        var trade_values = _und.values(traded_cards);
        //removes all elements that are null
        return _und.compact(trade_values).length == 4; //Magic number!
    }

    function resetTrade() {
        traded_cards = {"N": null, "S": null, "E": null, "W": null};
    }

    return {
        players: players,
        id: id,
        round: round,
        deck: deck,
        positions: positions,
        traded_cards: traded_cards,
        state: state,
        safe: safe,
        firstOpenPosition: firstOpenPosition,
        readyToTrade: readyToTrade,
        resetTrade: resetTrade
    }
}

module.exports.Table = Table;