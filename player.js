var Player = function (n, id) {
    var name = name;
    var id = id;
    var table;
    var cards = {};
    var score = 0;
    var position; //N, S, E, W

    /**
     * Associates a player with a table
     *
     * throws an error if the table is full or does not exist
     **/
    function joinTable (t) {
	if (t === null)
	    throw "Table does not exist";

	if (table["numPlayers"] < 4)
	    table = t;
	else
	    throw "Cannot join table " + t + ". Too many players";
    }

    return {
	name: n,
	id: id,
	table: table,
	score: score,
	cards: cards,
	position: position,
	joinTable: joinTable
    }
};

module.exports.Player = Player;
