$(document).ready(function() {
    var socket = Primus.connect(document.URL);
    var peer = null;
    var _local_stream;
    var _connected_peers = []; //list of all peer names

    var _state = "waiting"; // waiting, trading, playing, start_playing
    var _round = 0;
    var _players = {};
    var _cards = [];
    var _turn = "";
    var _name = "";
    var _trick_suit = "";
    var _hearts_broken = false;
    var _skip_trade = false;
    var _clear_trick_delay = 1500;

    var bottomCard = $("#bottom-played-card");
    var leftCard = $("#left-played-card");
    var rightCard = $("#right-played-card");
    var topCard = $("#top-played-card");

    $('#score-menu-btn').sidr({
        name: 'sidr-right',
        side: 'right',
        body: "#score-menu-btn",
        displace: true
    });

    // -------------------------------- Name logic ----------------------------- //

    function validateName() {
        var namedom = $("#playername");
        var buttons = $(".joinbtn,#newtable");
        var isValid = namedom.val().length > 0;
        if (isValid) {
            buttons.removeClass("disabled");
            _name = namedom.val();
        } else {
            buttons.addClass("disabled");
        }
        return isValid;
    }
    // When we start, check see if we should disable links
    validateName();

    //When we change the name field, disable/enable links
    $("#playername").on("input", validateName);

    // -------------------------------- Joining Tables ----------------------------- //

    function tableRowHtml(table) {
        var player_names = table.players.join(", ");
        var round = table.round;
        var t_id = table.id;

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
        if (validateName() === true) {
            //Prevent being able to double-click new game
            var buttons = $(".joinbtn,#newtable");
            buttons.addClass("disabled");
            socket.send("newTable", $("#playername").val());
        }
    });

    //Add a new table to all the users that are still looking for one
    socket.on("addTableRow", addTableRow);

    function addTableRow(table) {
        $("#tabletable-id tbody").append(tableRowHtml(table));
        //When we add a new table, check to see if we should make links inactive
        validateName();
        // If we click the button, join that table
        $("#" + table.id).click(joinTableClick);
    }

    socket.on("updateTableRow", function(table) {
        var row = $("#" + table.id).closest("tr");
        if (row.length === 0) {
            addTableRow(table);
        } else {
            row.replaceWith(tableRowHtml(table));
            validateName();
            $("#" + table.id).click(joinTableClick);
        }
    });

    function joinTableClick() {
        var id = $(this).attr("id");
        if (validateName() === true) {
            var buttons = $(".joinbtn,#newtable");
            buttons.addClass("disabled");
            socket.send("joinTable", id, $("#playername").val());
        }
    }

    socket.on("removeTableRow", function(table_id) {
        $("#" + table_id).closest("tr").remove();
    });

    var alertDialog = $("#name-taken");
    alertDialog.parent().addClass("hidden");
    $(".alert .close").on("click", function() {
        $(this).parent().addClass("hidden");
    });

    socket.on("duplicateName", function(name) {
        //Clear the text
        alertDialog.text("");
        alertDialog.append("<strong>" + name +
            "</strong> is already playing. Please choose another name");
        alertDialog.parent().removeClass("hidden");
    });

    // -------------------------------- Switching Views ----------------------------- //
    //Switch views to the table view
    socket.on("joinTable", function(table) {
        document.title = _name + ": Door Hearts";
        $("#tableslist").addClass("hidden");
        $("#game").removeClass("hidden");
    });

    socket.on("connectToChat", function(table) {
        if (peer === null) {
            peer = new Peer(_name, {
                key: '2kddwxi4hfcrf6r'
            });

            var video_settings = {
                video: true,
                audio: true
            };

            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            navigator.getUserMedia(video_settings, function(stream) {
                _local_stream = stream;
                $("#video-local").attr("src", URL.createObjectURL(_local_stream));
                $("#video-local").removeClass("hidden");
                socket.send("connectedToChat");
            }, function(err) {
                console.log('Failed to get local stream', err);
            });

            peer.on('call', function(call) {
                call.answer(_local_stream);
                call.on('stream', function(remoteStream) {
                    var streamer = _players[call.peer];
                    $('#video-' + streamer.dir).attr("src", URL.createObjectURL(remoteStream));
                    $('#video-' + streamer.dir).removeClass("hidden");
                    $('#img-' + streamer.dir).addClass("hidden");
                });
            });
        }
    });

    socket.on("addPeer", function(peer_name) {
        if (!(peer_name in _connected_peers) && peer_name !== peer.id) {
            _connected_peers = _.union(_connected_peers, [peer_name]);
            console.log(_connected_peers);
            peer.call(peer_name, _local_stream);
        }
    });

    $("#leave-table").click(function() {
        document.title = "Door Hearts";
        $("#game").addClass("hidden");
        $("#tableslist").removeClass("hidden");
        socket.send("leaveTable");
    });

    socket.on("disconnectChat", function(table) {
        console.log(table);
    });


    // -------------------------------- Game ----------------------------- //

    socket.on("nextRound", function(table) {
        console.log(table);
        if (_.size(_players) == 4) {
            _state = table.state;
            if (table.state == "trading") {
                _skip_trade = false;
                setInfoText("Select cards to trade (passing " + table.trade_dir + ")", color_grey);
            } else {
                _skip_trade = true;
            }

            socket.send("dealCards");
            $("#played-cards").removeClass("hidden");
        }
    });

    function setInfoText(text, color) {
        var text_div = $("#info-text");
        var nav_label_div = $(".nav-info");
        text_div.text("");
        text_div.append(text);
        if (color !== undefined) {
            _.each(color_map, function(value, key) {
                if (nav_label_div.hasClass(value)) {
                    nav_label_div.removeClass(value);
                }
            });
            nav_label_div.addClass(color);
        }
    }

    //all_pos: A map from position to {name: ?, score: ?}
    socket.on("updatePositions", function(your_pos, all_pos) {
        var pos_map = ["N", "W", "S", "E"];
        var dir_map = ["bottom", "right", "top", "left"];

        //Rotate the table around based on our position
        pos_map = _.rotate(pos_map, _.indexOf(pos_map, your_pos));
        var pos_dir_map = _.object(pos_map, dir_map);

        //Update the names for the score table
        var $score_table_head = $("#score-table thead tr th");

        //Add players that exist
        _.each(all_pos, function(player, pos) {
            var rel_dir = pos_dir_map[pos];
            var name = (player.name === null ? "Open" : player.name);
            var score = (player.score === undefined ? "0" : player.score);
            var name_div = $("#" + rel_dir + "name");
            name_div.text(name);
            name_div.addClass(color_map[pos]);
            name_div.removeClass(color_grey);

            name_div.append('<div class = "score-label">' + player.score + '</div>');
            _players[name] = {
                dir: rel_dir,
                pos: pos,
                score_div: name_div.find(".score-label"),
                color: color_map[pos]
            };

            //Update the score table's title
            var score_index = score_order.indexOf(pos);
            $score_table_head[score_index].innerText = name;
        });
        //Set ever other position to empty
        _.each(pos_dir_map, function(rel_dir, pos) {
            if (_.contains(_.keys(all_pos), pos) === false) {
                var open_div = $("#" + rel_dir + "name");
                open_div.text("Open");
                open_div.removeClass(color_map[pos]);
                open_div.addClass(color_grey);

                //Update the score table's title
                var score_index = score_order.indexOf(pos);
                $score_table_head[score_index].innerText = "Open";
            }
        });

        var remaining_player_count = 4 - _.size(all_pos);
        setInfoText("Waiting for " + remaining_player_count + " more players", color_grey);
    });

    socket.on("updateRemainingTrades", function(pass_dir, remaining_trades) {
        setInfoText(remaining_trades + " trades remaining (passing " + pass_dir + ")", color_grey);
    });

    //Deal the cards to each player
    socket.on("showCards", showCards);

    function showCards(cards) {
        _cards = _.sortBy(cards, function(card) {
            return sortValue(card);
        });

        var bottomCards = $("#bottomcards");

        //Delete the children and replace them
        bottomCards.children().remove();

        for (var i in _cards) {
            var card = _cards[i];
            bottomCards.append('<li>' +
                createCard(card.suit, card.rank, 'a') +
                '</li>'
            );
        }

        centerBottomCards();

        $("#bottomcards .card").click(function() {
            if (_state == "trading") {
                var openSlots = $(".empty-card-slot");
                if (openSlots.length > 0) {
                    var slot = $(openSlots[0]);
                    moveCardToCenter(slot, $(this));

                    slot.removeClass("empty-card-slot");
                    slot.removeClass("hide-card");
                    slot.addClass("filled-card-slot");

                    // Add a click handler to return card back to deck
                    slot.click(function() {
                        if ($(this).hasClass("filled-card-slot")) {
                            moveCardToHand($(this).find(".card"));

                            slot.addClass("empty-card-slot");
                            slot.addClass("hide-card");
                            slot.removeClass("filled-card-slot");

                            openSlots = $(".empty-card-slot");
                            if (openSlots.length > 0) {
                                //Tell the server that we aren't ready yet
                                socket.send("passCards", null);
                            }
                        }
                    });

                    if (openSlots.length == 1) {
                        _.delay(function() {
                            /*Wait 2 seconds before making trade final
                             * This is buggy:
                             * If you deselct a card then quickly reselct another,
                             * the event will still fire
                             */
                            var openSlots = $(".empty-card-slot");
                            if (openSlots.length === 0) {
                                emitTradedCards();
                            }
                        }, 1000);
                    }
                }
            } else if (_state == "playing") {
                if (_turn == _name && $(this).hasClass("disabled") === false) {
                    //Try to play the card
                    var played_card = idToCard($(this).attr("id"));
                    socket.send("playCard", played_card);
                }
            }
            centerBottomCards();
        });

        if (_skip_trade === true) {
            socket.send("skipPassCards");
            _skip_trade = false;
        }
    }

    function centerBottomCards() {
        var bottomCards = $("#bottomcards");
        var measureCard = $("#bottomcards li");
        // Magic numbers to center stack
        bottomCards.css("margin-left", measureCard.length * -measureCard.width() / 2 - 56);
    }

    function emitTradedCards() {
        var selected_cards = $(".filled-card-slot .card");
        if (selected_cards.length == 3) {
            var selected_cards_ids = selected_cards.map(function() {
                return idToCard(this.id);
            });
            socket.send("passCards", $.makeArray(selected_cards_ids));
        }
    }

    function moveCardToCenter(middleCard, handCard) {
        //Get the rank/suit information
        var id = handCard.attr("id");
        var card = idToCard(id);
        var index = cardIndex(card);

        //If we have the card, remove it
        handCard.closest("li").remove();
        if (index >= 0) {
            //Remove the card and flatten the array
            delete _cards[index];
            _cards = _.compact(_cards);
        }

        //Only show after we delete so the ids do not repeat
        showMiddleCard(middleCard, card);
    }

    function showMiddleCard(middleCard, card) {
        //Replace the middle card with the deck card
        middleCard.find(".card").replaceWith(createCard(card.suit, card.rank, "div"));
        middleCard.removeClass("hide-card");
    }

    function hideMiddleCard(middleCard) {
        //Hide the middle card
        middleCard.find(".card").replaceWith(createCard("", "", "div"));
        middleCard.addClass("hide-card");
    }

    function moveCardToHand(card) {
        id = card.attr("id");
        card_obj = idToCard(id);
        var suit = card_obj.suit;
        var rank = card_obj.rank;

        _cards[_cards.length] = card_obj;
        card.replaceWith(createCard("", "", "div"));

        showCards(_cards);
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

    socket.on("startPlaying", startPlaying);

    function startPlaying(table, new_hand) {
        _state = table.state;
        _round = table.round;
        _turn = table.turn;
        _hearts_broken = false;
        //This means we just finished trading cards
        if (_state == "start_playing") {
            _state = "playing";
            //Hide and clear the traded cards
            var tradeSlots = $(".filled-card-slot");
            tradeSlots.addClass("empty-card-slot");
            tradeSlots.addClass("hide-card");
            tradeSlots.removeClass("filled-card-slot");
            tradeSlots.find(".card").replaceWith(createCard("", "", "div"));

            showCards(new_hand);

            //Select the person to go first
            var two_of_clubs = {
                suit: "C",
                rank: 2
            };
            if (_turn == _name) {
                var two_of_clubs_id = cardToId(two_of_clubs);
                socket.send("playCard", two_of_clubs);
            }
        }
    }

    socket.on("nextPlayer", function(player_name) {
        _turn = player_name;
        if (_name == player_name) {
            disableAllCards();
            enableAllowedCards();
            setInfoText("It is your turn to play", _players[player_name].color);
            document.title = "It is your turn to play";
        } else {
            disableAllCards();
            setInfoText("It is " + player_name + "'s turn to play", _players[player_name].color);
            document.title = _name + ": Door Hearts";

        }
    });

    function disableAllCards() {
        $("#bottomcards .card").addClass("disabled");
    }

    function enableAllowedCards() {
        var $bc = $("#bottomcards");
        var $hearts = $bc.find(".card.hearts");
        var $diams = $bc.find(".card.diams");
        var $clubs = $bc.find(".card.clubs");
        var $spades = $bc.find(".card.spades");
        var $all_cards = $bc.find(".card");
        var $queen_of_spades = $bc.find(".card.rank-q.spades");

        console.log("Trick suit: " + _trick_suit);

        //If we are the first person
        if (_trick_suit === null) {
            //We can start with hearts if they are broken or if we only have hearts left
            if (_hearts_broken === true || ($hearts.length == $all_cards.length)) {
                $hearts.removeClass("disabled");
            }
            $diams.removeClass("disabled");
            $clubs.removeClass("disabled");
            $spades.removeClass("disabled");
        } else {
            var suit_class = suit_map[_trick_suit];
            var $playable_cards = $bc.find('.card.' + suit_class);
            //If we don't have the trick suit, allow every card
            if ($playable_cards.length === 0) {
                $playable_cards = $bc.find('.card');
            }
            $playable_cards.removeClass("disabled");
        }
        //Finally re-disable cards if this is the first trick
        if ($all_cards.length == 13) {
            $queen_of_spades.addClass("disabled");
            $hearts.addClass("disabled");
        }
    }

    socket.on("cardPlayed", function(opponent_name, card, trick_suit) {
        _trick_suit = trick_suit;
        var opponent = _players[opponent_name];
        if (opponent !== undefined) {
            var opponent_dir = opponent.dir;
            var played_card_spot = dir_card_map[opponent_dir];
            if (opponent_name == _name) {
                moveCardToCenter(bottomCard, $('#' + cardToId(card)));
                centerBottomCards();
            } else {
                showMiddleCard(played_card_spot, card);
            }
        }
    });

    socket.on("heartsBroken", function() {
        _hearts_broken = true;
        //TODO: Maybe an animation?
    });

    socket.on("clearTrick", function() {
        //TODO: Disable clicking the cards
        //Clear the cards after a delay
        _trick_suit = null;
        //Disable cards before starting the next trick
        disableAllCards();
        _.delay(function() {
            _.each(dir_card_map, function(card, dir) {
                hideMiddleCard(card);
                socket.send("nextTrick");
                //TODO: Enable clicking the cards
            });
        }, _clear_trick_delay);
    });

    socket.on("updateScore", function(name, score) {
        _players[name].score_div.text(score);
    });

    socket.on("updateScoreTable", function(scores, prev_scores) {
        //Add a new row to the table
        var $score_table = $("#score-table tbody");
        $score_table.append('<tr id = score-table-round-' + scores.round + '></tr>');

        var $this_round = $("#score-table-round-" + scores.round);

        for (var i in score_order) {
            var dir = score_order[i];
            var score = scores[dir];
            //Add the score to this round
            $this_round.append(scoreTableRow(score));

            if (prev_scores.round > 0) {
                var $last_round = $("#score-table-round-" + prev_scores.round);
                var $diffs = $last_round.find("small");
                //Update the difference text
                var diff = score - prev_scores[dir];
                $diffs[i].innerText = '+' + diff;
            }
        }

        //Show the scores and close after 3 seconds
        //TODO: Toggle for auto show
        $.sidr('open', 'sidr-right');
        _.delay(function() {
            $.sidr('close', 'sidr-right');
        }, 3000);
    });

    function scoreTableRow(score, diff) {
        return "<td><span class='total-score'>" + score + "</span>" +
            "<span class='round-score text-muted'>" +
            "<small></small>" +
            "</span></td>";
    }
    // -------------------------------- Helper Functions ----------------------------- //

    var dir_card_map = {
        "top": topCard,
        "bottom": bottomCard,
        "left": leftCard,
        "right": rightCard
    };
    var suit_map = {
        "H": "hearts",
        "C": "clubs",
        "S": "spades",
        "D": "diams"
    };
    var rank_map = {
        1: "a",
        11: "j",
        12: "q",
        13: "k"
    };
    var inv_rankmap = _.invert(rank_map);

    var color_blue = "label-primary";
    var color_yellow = "label-warning";
    var color_green = "label-success";
    var color_red = "label-danger";
    var color_grey = "label-default";

    var color_map = {
        "N": color_blue,
        "S": color_yellow,
        "E": color_green,
        "W": color_red,
        "Open": color_grey,
    };

    var score_order = ["N", "E", "S", "W"];

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

    function cardToId(card) {
        var rank = card.rank;
        var suit = card.suit;

        if (rank in rank_map) {
            rank = rank_map[rank];
        } else {
            rank = rank.toString();
        }
        return suit + rank;
    }

    function createCard(suit, rank, tag) {
        if (suit === "" && rank === "") {
            return '<' + tag + ' class="card">' +
                '<span class="rank"></span>' +
                '<span class="suit"></span>' +
                '</' + tag + '>';
        }

        var full_suit = suit_map[suit];
        var includeSuit = true;

        if (rank in rank_map) {
            rank = rank_map[rank];
        } else {
            rank = rank.toString();
            includeSuit = false;
        }
        return '<' + tag + ' id="' + suit + rank + '" ' +
            'class="card rank-' + rank + ' ' + full_suit + '">\n' +
            '<span class="rank">' + rank.toUpperCase() + '</span>' +
            '<span class="suit">' +
            (includeSuit ? ('&' + full_suit + ';') : '') +
            '</span>' +
            '</' + tag + '>';
    }

    function sortValue(card) {
        var suitVals = {
            "C": 0,
            "D": 1,
            "S": 2,
            "H": 3
        };
        //Give each suit a value for sorting
        var suitVal = suitVals[card.suit] * 13;
        //Aces are high
        var rankVal = card.rank == 1 ? 13 : card.rank - 1;
        return rankVal + suitVal;
    }

    _.mixin({
        rotate: function(array, n, guard) {
            var head, tail;
            n = (n === null) || guard ? 1 : n;
            n = n % array.length;
            tail = array.slice(n);
            head = array.slice(0, n);
            return tail.concat(head);
        }
    });
});