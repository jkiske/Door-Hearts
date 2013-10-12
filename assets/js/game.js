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

    socket.on("showCards", function(cards){
	if (ready) {
	    var suitmap = {"H":"suithearts" , "C":"suitclubs", 
			   "S":"suitspades", "D":"suitdiamonds"};
	    var cardmap = {1:"A", 11: "J", 12:"Q", 13:"K"};

	    var json = $.parseJSON(cards);
	    $.each(json, function(key, value) {
		var suit = suitmap[value["suit"]];
		
		if (value["rank"] in cardmap)
		    var rank = cardmap[value["rank"]];
		else
		    var rank = value["rank"];

		$("#cards").append("<div class = \" card " + suit + "\"> <p> " + rank + " </p> </div>");
		
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
