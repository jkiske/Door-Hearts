/** 
 * Creates a deck
 * 
 * @return An array containing a deck
 *         ex: "11H" is the Jack of hearts
 **/
function createDeck() {
    var suits = new Array("H", "C", "S", "D");
    var deck = new Array();
    var n = 52;
    var index = n/suits.length;
    
    var count = 0;
    for (i = 0; i <= 3; ++i) { 
	for (j = 1; j <= index; ++j) {
	    deck[count++] = j + suits[i];
	}
    }

    return deck;
}

/**
 * Shuffles a deck by moving the end card to a random position
 *
 * @return a shuffled deck 
 **/
function shuffleDeck(deck) {
    var endIndex = deck.length;
    var randIndex;

    var endCard;
    var randCard;

    if (endIndex === 0) return false;
    while (--endIndex) {
	randIndex = Math.floor(Math.random() * (endIndex + 1));
	endCard = deck[endIndex];
	randCard = deck[randIndex];
	
	//Swaps the two elements with each other
	deck[endIndex] = randCard;
	deck[randIndex] = endCard;
    }
    return deck;
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
function draw(deck, amount, hand, initial) {
    var cards = new Array();
    cards = deck.slice(0, amount);
    
    deck.splice(0, amount);

    if (!initial) {
	Array.prototype.push.apply(hand, cards);
    }
    return cards;
}

/**
 * Plays a card
 * 
 * @param hand the hand to remove a card from
 * @param index which card to remove
 * @return the hand with the card removed
 **/
function playCard(hand, index) {
    hand.splice(index, 1);
    return hand;
}

/** 
 * Export the functions so node.js knows they exist
 **/

exports.createDeck = createDeck;
exports.shuffleDeck = shuffleDeck;
exports.draw = draw;
exports.playCard = playCard;