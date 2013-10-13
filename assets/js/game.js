$(document).ready(function(){    
    var ready = false;

    $("#deal").attr("disabled", "disabled");
    $("welcome").hide();
    var socket = io.connect("http://localhost:8080");

    $("#ready").click(function() {
	var player = $("#player").val();
	console.log(player);
	console.log('called');
	socket.emit("addPlayer", player);
	ready = true;
	$("#deal").removeAttr("disabled");
	$("#ready").attr("disabled", "disabled");
	$("#player").remove();
	$("#welcome").show();
	$("#welcome").text("Welcome, " + player)
	console.log("Ready:" + ready);
    });

    $("#deal").click(function() {
	if (ready) {
	    console.log("dealing cards");
	    socket.emit("dealCards");
	    socket.emit("getOpponents");
	}
    });

    $("#newdeck").click(function() {
	if (ready) {
	    console.log("asking for new deck");
	    socket.emit("newDeck");
	}
    });

    socket.on("showCards", function(cards){
	if (ready) {
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

		$("#cards").append(
		    "<li> <a class = \"card rank-" + rank + " " + suit + "\" href=\"#\">\n \
			<span class=\"rank\">" + rank.toUpperCase() + "</span> \
			<span class=\"suit\">" + (includeSuit ? ("&" + suit + ";") : "")  + "</span> \
			</a> <li>");
	    });

	    
	    socket.on("displayOpponents", function(opponent){
		$("#opponents").text("Your opponent is: " + opponent);
	    });
	}
    });

    socket.on("remainingCards", function(remaining){
	if (ready) {
	    $("#pack").text();
	    $("#pack").text("Remaining cards are: " + remaining);
	}
    });
});
