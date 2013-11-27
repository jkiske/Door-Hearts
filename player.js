var _und = require("underscore");

var Player = function(n, socket_id) {
    var name = name;
    var id = socket_id;
    var table;
    var hand = [];
    var score = 0;
    var position; //N, S, E, W

    function cardIndex(card, hand) {
        var hand_index = -1;
        _und.each(hand, function(hand_card, index) {
            if (card.rank == hand_card.rank && card.suit == hand_card.suit) {
                hand_index = index;
            }
        });
        return hand_index;
    }

    function hasCards(cards, hand) {
        _und.each(cards, function(card) {
            if (cardIndex(card, hand) == -1) {
                return false;
            }
        });
        return true;
    }

    function hasCard(card) {
        return cardIndex(card, this.hand) >= 0;
    }

    function hasSuit(suit) {
        var cards_with_suit = _und.where(this.hand, {suit: suit});
        return cards_with_suit.length > 0;
    }

    function removeCards(cards) {
        var hand = this.hand;
        if (hasCards(cards, hand)) {
            _und.each(cards, function(card) {
                var index = cardIndex(card, hand);
                hand[index] = undefined;
                hand = _und.compact(hand);
            });
            this.hand = hand;
        }
    }

    function addCards(cards) {
        this.hand = _und.union(cards, this.hand);
    }

    function hasTwoOfClubs() {
        var two_of_clubs = {
            suit: "C",
            rank: 2
        };
        return cardIndex(two_of_clubs, this.hand) >= 0;
    }

    return {
        name: n,
        id: id,
        table: table,
        score: score,
        hand: hand,
        position: position,
        removeCards: removeCards,
        addCards: addCards,
        hasCard: hasCard,
        hasSuit: hasSuit,
        hasTwoOfClubs: hasTwoOfClubs
    };
};

module.exports.Player = Player;