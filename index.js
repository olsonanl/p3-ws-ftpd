var ftpd = require('ftpd');
var fs = require('fs');
var conf = require('./config');
var request = require('request');
var wsFS = require("./workspaceFileSystem");

var authURL = conf.get("authorizationURL");


var UIDMap = {byOwner:{},uid: {}}
 
var options = {
	listenPort: conf.get('ftpd_port') || 21,
	pasvPortRangeStart: conf.get('pasvPortRangeStart') || 4000,
	pasvPortRangeEnd: conf.get('pasvPortRangeEnd') || 5000,
	getInitialCwd: function(connection, callback) {
		//var userPath ='/' + connection.username + "@patricbrc.org/home";
		var userPath = "/" + connection.username + "@patricbrc.org";
//		fs.exists(userPath, function(exists) {
//			exists ? callback(null, userPath) : callback('path does not exist', userPath);
//		});
		callback(null,userPath);
	},
	getRoot: function(user) {
		return '/';
	},

	getUsernameFromUid: function(uid,callback) {
		console.log("getUsernameFromUid: ", uid, UIDMap);
		var name = UIDMap.uid[uid];
		if (!name) { name = "nobody"; }
//		name = name.replace("@patricbrc.org","");
		console.log("    Returning: ",name);
		callback(null,name);
	}
	
};

 
var host = conf.get('host') ||  '127.0.0.1';
 
var server = new ftpd.FtpServer(host, options);

server.readdir = function(path){
	console.log("READDIR : ", path);
}

console.log("server: ", server); 
server.on('client:connected', function(conn) {
	var username;
	console.log('Client connected from ' + conn.socket.remoteAddress);
	conn.on('command:user', function(user, success, failure) {
		conn.username = user;	
		success();
	});
	conn.on('command:pass', function(pass, success, failure) {
		console.log("LOGIN : ", conn.username, " Authentication URL: ", authURL);		
		request.post({url: authURL, form: {username: conn.username, password: pass}}, function(err,res,body){
			if (body) { success(conn.username,wsFS(conf.get('workspaceServiceURL'),conn.username + "@patricbrc.org", body, UIDMap)); return; }
			failure();
		})
	});
	conn.on('command:list', function(path, success, failure) {
		console.log("list: ", path);	
		success();
	});
	
	
});
 
server.listen(options.listenPort);
console.log('FTPD listening on port ' + options.listenPort);
