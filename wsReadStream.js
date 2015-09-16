var Readable = require("stream").Readable;
var util = require("util");
var when = require("promised-io/promise").when;
var request = require('request');

var ReadStream = function(path, options){
	Readable.call(this,options);
	this.rpc = options.rpc;
	this._path = path;
	this._fs = options.fs;
	this.started=false;
}

util.inherits(ReadStream, Readable);
var idx=1;

ReadStream.prototype._read = function(size){
	console.log("Start Read for ", this._path);
	var _self = this;
	this._fs.stat(this._path, function(err, stat){
		if (err) {
			throw Error("Error Reading Stream from Workspace: " + _self._path);
		}
//		console.log("Stat for: ", _self._path, " : ", stat);
		if (_self.started) {return;}
		_self.started=true;
		if (stat.link_reference){
			console.log("Stream from: ", stat.link_reference + "?download", " Token: ", _self._fs.token);
			var chunkIndex=1;
			var req = request({url: stat.link_reference + "?download", headers: {"Authorization": "OAuth " + _self._fs.token}});
			req.on("error", function(err){
					console.log("Error in shock response: ", err);
					_self.push(null);
				});

			req.on("data", function(data, encoding){
				_self.push(data,encoding);
			});

			req.on("end", function() {
				console.log("response on 'end': ");
				_self.push(null);
			})
		}else{
			
			when(_self._fs.wsGet(_self._path), function(res){
				if (res && res.data) {
					_self.push(res.data);
					_self.push(null);	
				}
			}, function(err){
				throw ("Error Reading Stream from Workspace: " + _self._path);	
			});
		}
	});

}

module.exports = ReadStream;
