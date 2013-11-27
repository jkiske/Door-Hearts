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
    var played_cards = {};
    var trick_suit;
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

    //Gets the next player, and sets the turn variable
    function nextTurn() {
        var player = this.players[this.turn];
        var player_pos = player.position;
        var order = ["N", "E", "S", "W"];
        var next_index = (order.indexOf(player_pos) + 1) % 4;
        var next_pos = order[next_index];
        var next_player_name = this.positions[next_pos];
        this.turn = next_player_name;
        return this.turn;
    }

    function resetPlayedCards() {
        played_cards = {};
        trick_suit = "";
    }

    function getWinner() {
        var scores = [];
        _und.each(this.played_cards, function(card, name){
            player = {name: name, score: 0};
            if(card.suit == this.trick_suit){
                player.score = card.value;
                if(player.score == 1){
                    player.score = 14;
                }
            }
            scores = _und.union(scores, [player]);
        });
        console.log(JSON.stringify(scores));
        var winner = _und.max(scores, function(player){ 
            return player.score;
        });
        console.log(winner.name);
        return winner.name;
    }

    function getPointsInTrick(){
        var score = 0;
        _und.each(this.played_cards, function(card, name){
            //Any heart
            if(card.suit == "H"){
                score += 1;
            }
            //Queen of spades
            else if (card.suit == "S" && card.rank == 12) {
                score += 13
            }
        });
        return score;
    }

    return {
        players: players,
        id: id,
        round: round,
        turn: turn,
        deck: deck,
        positions: positions,
        traded_cards: traded_cards,
        played_cards: played_cards,
        trick_suit: trick_suit,
        state: state,
        safe: safe,
        firstOpenPosition: firstOpenPosition,
        readyToTrade: readyToTrade,
        resetTrade: resetTrade,
        resetPlayedCards: resetPlayedCards,
        tradeMap: tradeMap,
        getPointsInTrick: getPointsInTrick,
        getWinner: getWinner,
        nextTurn: nextTurn
    };
};

module.exports.Table = Table;