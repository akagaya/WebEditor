const PORT = process.env.PORT || 3000;

var http = require("http");
var express = require("express");
var io = require("socket.io");
var url = require("url");

// Express初期化
var app = express();
app.get("/", function(req, res){
	res.redirect("/" + getUniqueStr());
});
app.get("/:roomID", function(req, res){
	res.sendFile(__dirname + "/index.html");
	console.log(req.params.roomID);
});
app.use(express.static(__dirname));

// http初期化、listen開始
var server = http.Server(app);
server.listen(PORT, function(){
	console.log("Server start. *:" + PORT);
})

var rooms = {};

// socket.io関連
var socket = io(server);
socket.on("connection", function(sock){
	var roomID = url.parse(sock.handshake.headers.referer).pathname;
	
	// socket接続時の初期化
	if(!rooms[roomID]){
		rooms[roomID] = {};
		rooms[roomID]["count"] = 0;
		rooms[roomID]["users"] = {};
	}
	sock.join(roomID);
	rooms[roomID]["users"][sock.id] = sock.id;
	rooms[roomID]["count"]++;

	console.log("Connect " + JSON.stringify(sock.handshake.address) + " roomID:" + roomID);
	socket.in(roomID).emit("memberchange", rooms[roomID]["count"]);
	
	var roomuser = socket.nsps["/"].adapter.rooms[roomID];
	
	// 初回データ同期
	for (var key in roomuser["sockets"]) {
		if(key != sock.id){
			socket.to(key).emit("dataplease");
			break;
		}
	}
	// socket接続時の初期化
	

	sock.on("edited", function(value){
		sock.broadcast.to(roomID).emit("receive", value);
	});
	
	
	// disconnectでroomから退出
	sock.on("disconnect", function(){
		delete rooms[roomID]["users"][sock.id];
		rooms[roomID]["count"]--;
		console.log(roomID + " " + rooms[roomID]["count"]);
		if( rooms[roomID]["count"] == 0 ){
			delete rooms[roomID];
		} else {
			sock.broadcast.to(roomID).emit("memberchange", rooms[roomID]["count"]);
		}
	})
});


function getUniqueStr(){
	return Math.floor(16 * Math.random() * 100000000).toString(16);
}