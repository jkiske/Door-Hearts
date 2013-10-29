var _und = require("underscore");
var _deck = require("./deck");

var Table = function() {
    var players = {};
    var positions={"N": null, "S": null, "E": null, "W": null};
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
	return {players: player_names, round: round, id: id};
    }

    function firstOpenPosition() {
        for (var pos in this.positions) {
            if (this.positions[pos] == null)
                return pos;
        }
        return undefined;
    }

    return {
	players: players,
	id: id,
	round: round,
	deck: deck,
	positions: positions,
	safe: safe,
	firstOpenPosition: firstOpenPosition
    }
}

module.exports.Table = Table;
