$(document).ready(function(){    

    var socket = io.connect("http://door-hearts.herokuapp.com");

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
    $("#newtable").click(function() {
	if (validateName() == true) {
	    console.log("creating new table");
	    socket.emit("newTable", $("#playername").val());
	}
    });

    //Add a new table to all the users that are still looking for one
    socket.on("addTableToTable", function(table) {
	var table = $.parseJSON(table)
	var players = _.values(table['players']);
	var round = table['round'];
	var t_id = table['id'];
	console.log(table);
	$('#tabletable-id tbody').append('<tr>' + 
					 '<td>' + players + '</td>' +
					 '<td>' + round + '</td>' +
					 '<td><div  id = "' + t_id + '" class=' + 
					 '"joinbtn text-center btn btn-sm btn-primary">' +
					 '<span class="glyphicon glyphicon-chevron-right"></span>' +
					 '</div></td>' +
					 '</tr>');
	
	//When we add a new table, check to see if we should make links inactive
	validateName();
	//Tell join an existing table
	$("#"+t_id+"").click(function() {
	    if (validateName() == true) {
		socket.emit("joinTable", t_id, $("#playername").val()); 
	    }
	});
    });
    
    // -------------------------------- Switching Views ----------------------------- //
    //Switch views to the table view
    socket.on("joinTable", function(table_json) {
	$('#tableslist').hide();
	$('#game').show();
	var table = $.parseJSON(table_json);
	var players = _.values(table["players"]);
	$.each(players, function(player) {
	    console.log(player.name);
	});
	console.log("Made new table " + table["id"]);	
    });


    // -------------------------------- Game ----------------------------- //

    $("#play").click(function() {
	$("#play").hide();
	$("#played-cards").removeClass("hidden");
	socket.emit("dealCards");
    });

    //Deal the cards to each player
    socket.on("showCards", function(cards){
	var suitmap = {"H":"hearts" , "C":"clubs", 
		       "S":"spades", "D":"diams"};
	var cardmap = {1:"a", 11: "j", 12:"q", 13:"k"};

	var json = $.parseJSON(cards);
	$.each(json, function(key, value) {
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
		    "class = \"card rank-"+rank+" " + suit + "\" href=\"#\">\n" +
		    "<span class=\"rank\">" + rank.toUpperCase() + "</span>" +
		    "<span class=\"suit\">" + 
		    (includeSuit ? ("&" + suit + ";") : "") +
		    "</span>" +
		    "</a>" +
		"</li>"
	    );

	});
    });

});
