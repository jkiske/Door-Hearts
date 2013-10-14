var Table = function() {
    var players = {};
    var id = createGuid();
    var round = 0;
    

    function createGuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
	});
    }

    return {
	players: players,
	id: id,
	round: round
    }
}

module.exports.Table = Table;
