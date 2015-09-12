var Readable = require("stream").Readable;
var util = require("util");
var when = require("promised-io/promise").when;
var request = require('request');

var ReadStream = function(path, options){
	Readable.call(this,options);
	this.rpc = options.rpc;
	this._path = path;
	this._fs = options.fs;
	
}

util.inherits(ReadStream, Readable);

ReadStream.prototype._read = function(size){
	console.log("Start Read for ", this._path);
	var _self = this;
	if (!this._ended){
	this._fs.stat(this._path, function(err, stat){
		if (err) {
			throw Error("Error Reading Stream from Workspace: " + _self._path);
		}
//		console.log("Stat for: ", _self._path, " : ", stat);

		if (stat.link_reference){
			console.log("Stream from: ", stat.link_reference);
			var req = request({url: stat.link_reference, headers: {"Authorization": "OAuth " + _self._fs.token}});
			req.on("response", function(response){
				response.on("error", function(err){
					console.log("Error in shock response: ", err);
				});
				response.on("data", function(data){
					console.log("Got Data from Shock: ", data);
					_self.push(data);
				});

				response.on("end", function(data) {
					_self.push(null);
				});
			})

		}else{
			when(_self._fs.wsGet(_self._path), function(res){
				if (res && res.data) {
					_self.push(res.data);
					_self.push(null);	
					_self._ended = true;
				}
			}, function(err){
				throw ("Error Reading Stream from Workspace: " + _self._path);	
			});
		}
	});
	}

}

module.exports = ReadStream;
