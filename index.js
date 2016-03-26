var ftpd = require('ftpd');
var fs = require('fs');
var conf = require('./config');
var request = require('request');
var wsFS = require("./workspaceFileSystem");

var authURL = conf.get("authorizationURL");


var UIDMap = {byOwner:{},uid: {}}

var tlsOptions={
	rejectUnauthorized: false
};

if (conf.get("sslCertificateKeyFile")){
	tlsOptions.key=fs.readFileSync(conf.get("sslCertificateKeyFile")).toString();
}

if (conf.get("sslCertificateFile")){
	tlsOptions.cert=fs.readFileSync(conf.get("sslCertificateFile")).toString();
}
 
var options = {
	listenPort: conf.get('ftpd_port') || 21,
	pasvPortRangeStart: conf.get('pasvPortRangeStart') || 4000,
	pasvPortRangeEnd: conf.get('pasvPortRangeEnd') || 5000,
	useWriteFile: false,
	useReadFile: false,
	tlsOnly: conf.get("tlsOnly")||false,
	tlsOptions: tlsOptions,
	logLevel: conf.get("logLevel")||0,
	getInitialCwd: function(connection, callback) {
		var userPath = "/" + connection.username + "@patricbrc.org";
		callback(null,userPath);
	},
	getRoot: function(user) {
		return '/';
	},

	getUsernameFromUid: function(uid,callback) {
		var name = UIDMap.uid[uid];
		if (!name) { name = "nobody"; }
		callback(null,name);
	},

	getGroupFromGid: function(gid,c){
		c(null, "nogroup");
	}
	
};

 
var host = conf.get('host') ||  '127.0.0.1';
console.log("FTPD Host: ", host);
 
var server = new ftpd.FtpServer(host, options);

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
	
});
 
server.listen(options.listenPort);
console.log('FTPD listening on port ' + options.listenPort);
