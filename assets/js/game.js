$(document).ready(function() {
    var socket = io.connect("http://localhost:8888");

    var state = 'waiting'; // waiting, trading, playing
    var _players = {};
    var _cards = [];

    var bottomCard = $('#bottom-played-card');
    var leftCard = $('#left-played-card');
    var rightCard = $('#right-played-card');
    var topCard = $('#top-played-card');

    // Hide the game at the start
    $('#game').hide();

    // -------------------------------- Name logic ----------------------------- //

    function validateName() {
        var namedom = $("#playername");
        var buttons = $(".joinbtn,#newtable");
        if (namedom.val().length > 0) {
            buttons.removeClass("disabled");
        } else {
            buttons.addClass("disabled");
        }
        return namedom.val().length > 0;
    }
    // When we start, check see if we should disable links
    validateName();

    //When we change the name field, disable/enable links
    $("#playername").on('input', validateName);


    // -------------------------------- Joining Tables ----------------------------- //

    function rowHtml(table) {
        var player_names = table['players'].join(", ");
        var round = table['round'];
        var t_id = table['id'];

        return '<tr>' +
            '<td>' + player_names + '</td>' +
            '<td>' + round + '</td>' +
            '<td><div  id = "' + t_id + '" class=' +
            '"joinbtn text-center btn btn-sm btn-primary">' +
            '<span class="glyphicon glyphicon-chevron-right"></span>' +
            '</div></td>' +
            '</tr>';

    }
    $("#newtable").click(function() {
        if (validateName() == true) {
            //Prevent being able to double-click new game
            var buttons = $(".joinbtn,#newtable");
            buttons.addClass("disabled");
            socket.emit("newTable", $("#playername").val());
        }
    });

    //Add a new table to all the users that are still looking for one
    socket.on("addTableRow", function(table) {
        var table = $.parseJSON(table)
        $('#tabletable-id tbody').append(rowHtml(table));

        //When we add a new table, check to see if we should make links inactive
        validateName();

        // If we click the button, join that table
        $("#" + table.id).click(function() {
            if (validateName() == true) {
                //Prevent being able to double-click new game
                var buttons = $(".joinbtn,#newtable");
                buttons.addClass("disabled");
                socket.emit("joinTable", table.id, $("#playername").val());
            }
        });
    });

    socket.on("updateTableRow", function(table) {
        var table = $.parseJSON(table);
        var row = $("#" + table.id).closest("tr");
        row.replaceWith(rowHtml(table));

        // When we re-add the row we have to reattach the handler
        $("#" + table.id).click(function() {
            if (validateName() == true) {
                var buttons = $(".joinbtn,#newtable");
                buttons.addClass("disabled");
                socket.emit("joinTable", table.id, $("#playername").val());
            }
        });
    });

    socket.on("removeTableRow", function(table_id) {
        $("#" + table_id).closest("tr").remove();
    });

    var alertDialog = $("#name-taken");
    alertDialog.parent().hide();
    $('.alert .close').on("click", function() {
        $(this).parent().hide();
    });
    socket.on("duplicateName", function(name) {
        //Clear the text
        alertDialog.text("");
        alertDialog.append("<strong>" + name +
            "</strong> is already playing. Please choose another name");
        alertDialog.parent().show();
    });

    // -------------------------------- Switching Views ----------------------------- //
    //Switch views to the table view
    socket.on("joinTable", function(table) {
        $('#tableslist').hide();
        $('#game').show();
    });


    // -------------------------------- Game ----------------------------- //

    socket.on('startGame', function() {
        if (_.size(_players) == 4) {
            socket.emit("dealCards");
            $("#played-cards").removeClass("hidden");

            state = 'trading';
            setInfoText("Select cards to trade");
        }
    });

    function setInfoText(text) {
        var text_div = $('#info-text');
        text_div.text('');
        text_div.append(text);
    }

    socket.on("updatePositions", function(your_pos, all_pos) {
        your_pos = $.parseJSON(your_pos);

        //A map from position to {name: ?, score: ?}
        all_pos = $.parseJSON(all_pos);

        var dir_map = ["bottom", "right", "top", "left"];
        var pos_map = ["N", "W", "S", "E"];
        //Rotate the table around based on our position
        pos_map = _.rotate(pos_map, _.indexOf(pos_map, your_pos));

        var pos_dir_map = _.object(pos_map, dir_map);
        //Add players that exist
        _.each(all_pos, function(player, pos) {
            var rel_dir = pos_dir_map[pos];
            var name = (player.name == null ? "Open" : player.name);
            var score = (player.score == undefined ? "0" : player.score);
            _players[pos] = {
                dir: rel_dir,
                name: name
            };
            console.log(_players);
            $("#" + rel_dir + "name").text(name + ": " + score);
        });
        //Set ever other position to empty
        _.each(pos_dir_map, function(rel_dir, pos) {
            if (_.contains(_.keys(all_pos), pos) == false) {
                $("#" + rel_dir + "name").text("Open");
            }
        });
        var remaining_player_count = 4 - _.size(all_pos);
        setInfoText("Waiting for " + remaining_player_count + " more players");

    });

    //Deal the cards to each player
    socket.on("showCards", showCards);

    function showCards(cards) {
        _cards = $.parseJSON(cards);
        _cards = _.sortBy(_cards, function(card) {
            return sortValue(card);
        });

        var bottomCards = $('#bottomcards');

        //Delete the children and replace them
        bottomCards.children().remove();
        $.each(_cards, function(key, value) {
            bottomCards.append('<li>' +
                createCard(value['suit'], value['rank'], 'a') +
                '</li>'
            );
        });
        var measureCard = $('#bottomcards li');
        // Magic numbers to center stack
        bottomCards.css("margin-left", measureCard.length * -measureCard.width() / 2 - 56);

        $("#bottomcards .card").click(function() {
            if (state == 'trading') {
                var openSlots = $('.empty-card-slot');
                if (openSlots.length > 0) {
                    var slot = $(openSlots[0]);
                    moveCardToCenter(slot, $(this), false);

                    var card = idToCard($(this).attr('id'));
                    var index = cardIndex(card);

                    if (index >= 0) {
                        //Remove the card and flatten the array
                        delete _cards[index];
                        _cards = _.compact(_cards);
                    }

                    slot.removeClass('empty-card-slot');
                    slot.removeClass('hide-card');
                    slot.addClass('filled-card-slot');

                    // Add a click handler to return card back to deck
                    slot.click(function() {
                        if ($(this).hasClass('filled-card-slot')) {
                            moveCardToHand($(this).find('.card'));

                            slot.addClass('empty-card-slot');
                            slot.addClass('hide-card');
                            slot.removeClass('filled-card-slot');

                            if (openSlots.length == 2) {
                                //Tell the server that we aren't ready yet
                                console.log("I'm changing my mind!");
                                socket.emit("passCards", null);
                            }
                        }
                    });

                    if (openSlots.length == 1) {
                        console.log("Submit my cards to trade");
                        emitTradedCards();
                    }
                }
            } else if (state == 'playing') {
                moveCardToCenter(bottomCard, $(this), true);
                bottomCard.removeClass('hide-card');
            }

            var measureCard = $('#bottomcards li');
            // Magic numbers to center stack
            bottomCards.css("margin-left", measureCard.length * -measureCard.width() / 2 - 56);

        });
    }

    function emitTradedCards() {
        var selected_cards = $('.filled-card-slot .card');
        if (selected_cards.length == 3) {
            var selected_cards_ids = selected_cards.map(function() {
                return idToCard(this.id);
            });
            socket.emit("passCards", $.makeArray(selected_cards_ids));
        }
    };

    function moveCardToCenter(middleCard, handCard, shouldEmit) {
        //Get the rank/suit information
        var id = handCard.attr('id');
        handCardObj = idToCard(id);
        var suit = handCardObj.suit;
        var rank = handCardObj.rank;

        //Replace the middle card with the deck card
        middleCard.find('.card').replaceWith(createCard(suit, rank, 'div'));

        //Remove the deck card
        handCard.closest('li').remove();

        if (shouldEmit)
            socket.emit('submitCard', suit + rank);
    }

    function moveCardToHand(card) {
        id = card.attr('id');
        card_obj = idToCard(id);
        var suit = card_obj.suit;
        var rank = card_obj.rank;

        _cards[_cards.length] = card_obj;

        showCards(JSON.stringify(_cards));
    }

    function cardIndex(card) {
        var hand_index = -1;
        _.each(_cards, function(hand_card, index) {
            if (card.rank == hand_card.rank && card.suit == hand_card.suit) {
                hand_index = index;
            }
        });
        return hand_index;
    }

    socket.on("opponentPlayedCard", function(name, card) {
        var card = $.parseJSON(card);
        var name = $.parseJSON(name);
        console.log("Player " + name + "played card " + card);
    });
});

var suitmap = {
    "H": "hearts",
    "C": "clubs",
    "S": "spades",
    "D": "diams"
};
var rankmap = {
    1: "a",
    11: "j",
    12: "q",
    13: "k"
};
var inv_rankmap = _.invert(rankmap);

// Converts a card id to an object

function idToCard(id) {
    rank = id.slice(1);
    if (rank in inv_rankmap)
        rank = inv_rankmap[rank];

    return {
        suit: id.slice(0, 1),
        rank: parseInt(rank)
    };
}

function createCard(suit, rank, tag) {
    var full_suit = suitmap[suit];
    var includeSuit = true;

    if (rank in rankmap) {
        var rank = rankmap[rank];
        if (rank == "a")
            includeSuit = false;
    } else {
        var rank = rank.toString();
        includeSuit = false;
    }

    return "<" + tag + " id=\"" + suit + rank + "\" " +
        "class=\"card rank-" + rank + " " + full_suit + "\">\n" +
        "<span class=\"rank\">" + rank.toUpperCase() + "</span>" +
        "<span class=\"suit\">" +
        (includeSuit ? ("&" + full_suit + ";") : "") +
        "</span>" +
        "</" + tag + ">";
}

function sortValue(card) {
    var suitVals = {
        "C": 0,
        "D": 1,
        "S": 2,
        "H": 3
    };
    //Give each suit a value for sorting
    var suitVal = suitVals[card["suit"]] * 13;
    //Aces are high
    var rankVal = card["rank"] == 1 ? 13 : card["rank"] - 1;
    return rankVal + suitVal;
}

_.mixin({
    rotate: function(array, n, guard) {
        var head, tail;
        n = (n == null) || guard ? 1 : n;
        n = n % array.length;
        tail = array.slice(n);
        head = array.slice(0, n);
        return tail.concat(head);
    }
});