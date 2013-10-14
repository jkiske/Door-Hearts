var Player = function (n, id) {
    var name = name;
    var id = id;
    var table;
    var deck = {};

    /**
     * Removes a card from the players deck
     *
     * @return the card
     * throws an error if the card is not in the deck
     **/
    function removeCard(card) {
	if (card in deck) {
	    array.splice(deck.indexOf(card), 1);
	} else {
	    throw "Card: " + card  + " not in deck: " + deck;
	}
	return card;
    }

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
	removeCard: removeCard,
	joinTable: joinTable
    }
};

module.exports.Player = Player;
