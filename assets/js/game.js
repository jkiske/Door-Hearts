$(document).ready(function(){
    var socket = Primus.connect("http://localhost:8888");

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
	$('#tabletable-id tbody').append(rowHtml(table));

	//When we add a new table, check to see if we should make links inactive
	validateName();

	// If we click the button, join that table
	$("#"+table.id).click(function() {
	    if (validateName() == true) {
		//Prevent being able to double-click new game
		var buttons = $(".joinbtn,#newtable");
		buttons.addClass("disabled");
		socket.emit("joinTable", table.id, $("#playername").val());
	    }
	});
    });

    socket.on("updateTableRow", function(table) {
	var row = $("#"+table.id).closest("tr");
	row.replaceWith(rowHtml(table));

	// When we re-add the row we have to reattach the handler
	$("#"+table.id).click(function() {
	    if (validateName() == true) {
		var buttons = $(".joinbtn,#newtable");
		buttons.addClass("disabled");
		socket.emit("joinTable", table.id, $("#playername").val());
	    }
	});
    });

    socket.on("removeTableRow", function(table_id) {
	$("#"+table_id).closest("tr").remove();
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

    $("#play").click(function() {
	$("#play").hide();
	$("#played-cards").removeClass("hidden");
	socket.emit("dealCards");
    });

    socket.on("updatePositions", function(your_pos, all_pos) {
	//all_pos: A map from position to {name: ?, score: ?}

	var dir_map = ["bottom", "right", "top", "left"];
	var pos_map =["N", "W", "S", "E"];
	//Rotate the table around based on our position
	pos_map = _.rotate(pos_map, _.indexOf(pos_map, your_pos));

	var pos_dir_map =  _.object(pos_map, dir_map);
	//Add players that exist
	_.each(all_pos, function (player, pos) {
	    var rel_dir = pos_dir_map[pos];
	    var name = (player.name == null ? "Open" : player.name);
	    var score = (player.score == undefined ? "0" : player.score);
	    console.log(rel_dir + "is player: " + name + ": " + score);
	    $("#"+rel_dir+"name").text(name + ": "+ score);
	});
	//Set ever other position to empty
	_.each(pos_dir_map, function(rel_dir, pos) {
	    if (_.contains(_.keys(all_pos), pos) == false) {
		$("#"+rel_dir+"name").text("Open");
	    }
	});

    });

    //Deal the cards to each player
    socket.on("showCards", function(cards){
	var suitmap = {"H":"hearts" , "C":"clubs",
		       "S":"spades", "D":"diams"};
	var cardmap = {1:"a", 11: "j", 12:"q", 13:"k"};

	$.each(cards, function(key, value) {
	    var suit = suitmap[value["suit"]];
	    var includeSuit = true;

	    if (value["rank"] in cardmap) {
		var rank = cardmap[value["rank"]];
		if (rank == "a")
		    includeSuit = false;
	    } else {
		var rank = value["rank"].toString();
		includeSuit = false;
	    }

	    $("#bottomcards").append(
		"<li>" +
		    "<a id=\"" + value["suit"] + value["rank"] + "\"" +
		    "class = \"card rank-"+rank+" " + suit + "\">\n" +
		    "<span class=\"rank\">" + rank.toUpperCase() + "</span>" +
		    "<span class=\"suit\">" +
		    (includeSuit ? ("&" + suit + ";") : "") +
		    "</span>" +
		    "</a>" +
		"</li>"
	    );
	});

	$("a.card").click(function() {
	    console.log("Clicked " + $(this).attr("id"));
	});

    });

});

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
