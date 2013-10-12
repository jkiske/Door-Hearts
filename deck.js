var Deck = function() {
    /** 
     * Creates a deck
     * 
     * @return An array containing a deck
     *         ex: "11H" is the Jack of hearts
     **/
    var suits = new Array("H", "C", "S", "D");
    var n = 52;
    var cards = new Array();

    var index = n/suits.length;
    var count = 0;
    for (i = 0; i <= 3; ++i) { 
	for (j = 1; j <= index; ++j) {
	    cards[count++] = {suit: suits[i], rank: j};
	}
    }


    /**
     * Shuffles a deck by moving the end card to a random position
     *
     * @return a shuffled deck 
     **/
    function shuffle() {
	var endIndex = cards.length;
	var randIndex;

	var endCard;
	var randCard;

	if (endIndex === 0) return false;
	while (--endIndex) {
	    randIndex = Math.floor(Math.random() * (endIndex + 1));
	    endCard = cards[endIndex];
	    randCard = cards[randIndex];
	    
	    //Swaps the two elements with each other
	    cards[endIndex] = randCard;
	    cards[randIndex] = endCard;
	}
	return cards;
    }

    /**
     * Draws a card from the deck
     *
     * @param deck the deck to use
     * @param amount the number of cards to draw
     * @param hand the hand to add cards to 
     * @param initial if this is the first draw
     * @return A hand of cards removed from the deck, also adds cards to
     * hand variable
     **/
    function draw(amount, hand, initial) {
	var drawnCards = new Array();
	drawnCards = cards.slice(0, amount);
	
	cards.splice(0, amount);

	if (!initial) {
	    Array.prototype.push.apply(hand, drawnCards);
	}
	return drawnCards;
    }
    return {
	shuffle: shuffle,
	draw: draw,
	cards: cards
    }
}();

/** 
 * Export the functions so node.js knows they exist
 **/
module.exports.Deck = Deck;
