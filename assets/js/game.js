$(document).ready(function(){    

    var socket = io.connect("http://door-hearts.herokuapp.com");

    $('#game').hide();

    $("#deal").click(function() {
    	console.log("dealing cards");
    	socket.emit("dealCards");
    	socket.emit("getOpponents");
    });

    // $("#newdeck").click(function() {
    // 	if (ready) {
    // 	    console.log("asking for new deck");
    // 	    socket.emit("newDeck");
    // 	}
    // });

    //Tell the server to create a new table
    $("#newtable").click(function() {
	var table_name = $("#table_name").val();
	
	console.log("creating new table");
	socket.emit("newTable", table_name);
	
    });

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

    //Add a new table to all the users that are still looking for one
    socket.on("addTableToTable", function(table) {
	$('#tabletable-id tbody').append('<tr>' + 
					 '<td>Players</td>' +
					 '<td>Round</td>' +
					 '<td><div class="text-center btn btn-sm btn-primary">' +
					 '<span class="glyphicon glyphicon-chevron-right"></span>' +
					 '</div></td>' +
					 '</tr>');
	
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

    // socket.on("remainingCards", function(remaining){
    // 	if (ready) {
    // 	    $("#pack").text();
    // 	    $("#pack").text("Remaining cards are: " + remaining);
    // 	}
    // });


});
