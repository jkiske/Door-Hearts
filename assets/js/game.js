$(document).ready(function(){    

    var socket = io.connect("http://door-hearts.herokuapp.com");

    $('#game').hide();

    $("#deal").click(function() {
	console.log("dealing cards");
    	socket.emit("dealCards");
    });

    // $("#newdeck").click(function() {
    // 	if (ready) {
    // 	    console.log("asking for new deck");
    // 	    socket.emit("newDeck");
    // 	}
    // });

    //Tell the server to create a new table
    $("#newtable").click(function() {
	console.log("creating new table");
	socket.emit("newTable");
	
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
	
	//Tell join an existing table
	$("#"+t_id+"").click(function() {
	    console.log("joining table " + t_id);
	    socket.emit("joinTable", t_id); 
	});

    });

    $("#name").on('input', function() {
	var namedom = $("#name");
	var playbtn = $("#play");
	if (namedom.val().length > 0) {
	    playbtn.removeClass("disabled");
	} else {
	    playbtn.addClass("disabled");
	}
    });

    $("#play").click(function() {
	var namedom = $("#name");
        var playbtn = $("#play");
	if (namedom.val().length > 0) {
	    socket.emit("addPlayer", namedom.val());
	}
	$("#newplayer").hide();
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

    // socket.on("remainingCards", function(remaining){
    // 	if (ready) {
    // 	    $("#pack").text();
    // 	    $("#pack").text("Remaining cards are: " + remaining);
    // 	}
    // });


});
