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
	    $("#cards").text(cards);
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
