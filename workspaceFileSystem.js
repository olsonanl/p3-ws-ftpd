var request = require('request');
var defer = require("promised-io/promise").defer;
var when = require("promised-io/promise").when;
var WSReadStream= require('./wsReadStream');
var WriteStream = require("stream").Writable;
var ReadStream = require("stream").Readable;
var PassThrough = require("stream").PassThrough;
var Path = require("path");
var typeFromExtension = require("./typeMap");
var FormData = require('form-data');



/*
require('request-debug')(request, function(type, data, r){
	console.log("Type: ", type);
	console.log("Data: ", data);	
});
*/

//require('request-debug')(request);

module.exports = function(workspaceURL, username, token, UIDMap) {
	var idx=1;
	var UIDidx = 100;

	var rpc = function(method, params, options){
		var def = new defer();
		var reqBody = {id:idx++, method:method, params:params, jsonrpc: "2.0"};
		request({
			url: workspaceURL,
			method: "POST",
			headers: {
				"Authorization": token,
				"X-Requested-With": false,
				"content-type": "application/json",
				"accept": "application/json"
			},
			json: true,
			body: reqBody
		}, function(err, res, body)	{
//			console.log("RPC Response Body: ", body);
//			console.log("RES: ", res);

			if (err || body.error){
				return def.reject(err || body.error);
			}

			def.resolve(body.result);
		});

		return def.promise;
	}

	var statCache = {}


	var wsCreate = function(obj, createUploadNode,overwrite){
            var _self=this;
            console.log("WorkspaceManager.create(): ", obj);
            if (obj.path.charAt(obj.path.length-1)!="/") {
                obj.path = obj.path + "/";
            }
            console.log("Workspace.create: ", obj.path, obj.path+obj.name, "Overwrite: ", overwrite);
            return when(rpc("Workspace.create",[{objects:[[(obj.path+obj.name),(obj.type||"unspecified"),obj.userMeta||{},(obj.content||"")]],createUploadNodes:createUploadNode,overwrite:overwrite}]), function(results){
		var res;
		console.log("Create Results: ", results);
		if (!results[0][0] || !results[0][0]) {
			throw new Error("Error Creating Object");
		}else{
			var r = results[0][0];
			var out = {
				id: r[4],
				path: r[2] + r[0],
				name: r[0],
				type: r[1],
				creation_time: r[3],
				link_reference: r[11],
				owner_id: r[5],
				size: r[6],
				userMeta: r[7],
				autoMeta: r[8],
				user_permission: r[9],
				global_permission: r[10]
			}
		return out;
                                        }
            });
        }


	var wsGet= function(path,metadataOnly){

            return when(rpc("Workspace.get",[{objects: [path], metadata_only:metadataOnly}]), function(results){
                if (!results || !results[0] || !results[0][0] || !results[0][0][0] || !results[0][0][0][4]) {
                    throw new Error("Object not found: ");
                }
                var meta = {
                    name: results[0][0][0][0],
                    type: results[0][0][0][1],
                    path: results[0][0][0][2],
                    creation_time: results[0][0][0][3],
                    id: results[0][0][0][4],
                    owner_id: results[0][0][0][5],
                    size: results[0][0][0][6],
                    userMeta: results[0][0][0][7],
                    autoMeta: results[0][0][0][8],
                    user_permissions: results[0][0][0][9],
                    global_permission: results[0][0][0][10],
                    link_reference: results[0][0][0][11]
                }
                if (metadataOnly) { return meta; }

		console.log("metadata: ", meta);
                var res = {
                    metadata: meta,
                    data: results[0][0][1]
                }
                return res;
            });

	}

	var fs = {
		_token: token,
		username: username,
		rootFolders: null,
		readdir: function(path, callback) {
			console.log("readdir(): ", path);
			if (this.rootFolders) {
				callback(null, this.rootFolders);
			}
			rpc("Workspace.ls", [{
				paths: [path],
				includeSubDirs: false,
				recursive: false
			}]).then(function(results){
				
				if (!results || ! results[0] || !results[0][path]) {
					if (Object.keys(results[0]).length < 1) {
						callback(null, []);
						return;
					}
					console.log("results: ", results[0]);
					callback("Invalid Path: " + path);
					return;
				}	
				var flist = results[0][path].map(function(r){
					var d = {
						id: r[4],
						path: r[2] + r[0],
						name: r[0],
						type: r[1],
						creation_time: r[3],
						link_reference: r[11],
						owner_id: r[5],
						size: r[6],
						userMeta: r[7],
						autoMeta: r[8],
						user_permission: r[9],
						global_permission: r[10]
					}	

					console.log("Found: ",path, " type: ", d.type);
					statCache[d.path] = d;

					var name = d.name;

					if (UIDMap && UIDMap.byOwner && UIDMap.byOwner[d.owner_id]) {
						d.uid = UIDMap.byOwner[d.owner_id] 
					}else{
						d.uid = UIDidx;
						UIDMap.byOwner[d.owner_id] = UIDidx
						UIDMap.uid[UIDidx] = d.owner_id;
						UIDidx+=1;
					}
					if (path == "/"){
						var name = r[2].split("/")[1];
						var rootWS = {}
						for (var prop in d){
							rootWS[prop]=d[prop];
						}
						rootWS.name = name;
						rootWS.path = "/" + name;	
						statCache["/" + name]=rootWS;
					}

					return name;
				});

				//console.log("flist: ", flist);
				if (path == "/") {
					var map = {}
					flist.forEach(function(n){
						map[n]=true;
					});
					flist = Object.keys(map);
					this.rootFolders = flist;
					
				}

				//console.log("flist: ", flist);

				callback(null, flist);
			});
		},
		unlink: function(path,callback){
			rpc("Workspace.delete", [{
				objects: [path],
				deleteDirectories: false,
				force: false,
				adminmode: false
			}]).then(function(results){
				console.log("DELETED: " + path);
				callback()
			}, function(err){
				console.log("ERROR DELETING " + path + " : " + err);
				callback(err);
			});
	
		},
		mkdir: function(path){  /* path,[mode,]callback */
			var mode,callbak;
			if (arguments.length>2){
				mode = arguments[1];
				callback = arguments[2]
			}else{
				callback = arguments[1];
			}

			rpc("Workspace.create", [{
				objects: [[path,"Directory"]],
			}]).then(function(results){
				console.log("MKDIR Complete: ", path);
				callback()
			}, function(err){
				console.log("ERROR creating directory " + path + " : " + err);
				callback(err);
			});

		},
		open: function(path,flags){  /* path,flags, [mode,] callback */
			console.log("WorkspaceFS.open(): ", path);
			arguments[arguments.length-1]();
		},

		close: function(fd,callback){
			console.log("close() not implemented");
		},
		rmdir: function(path, callback){
			rpc("Workspace.delete", [{
				objects: [path],
				deleteDirectories: true,
				force: false,
				adminmode: false
			}]).then(function(results){
				console.log("RMDIR Complete: ", path);
				callback()
			}, function(err){
				console.log("RMDIR ERROR: " + err);
				callback(err);
			});

		},
		rename: function(oldpath,newpath,callback){
			console.log("Rename Not Implemented");
			callback("Rename Not Implemented");
		},

		buildStatObj: function(obj){
		
			var mode = 448;
			
			if (!obj.global_permission || obj.global_permission && (obj.global_permission!="n")) {
				mode = 453;
			}

			var sobj = {
				dev: 1,
				ino: 1,
				mode: mode,
				nlink: 1,
				uid: (obj && obj.uid)?obj.uid:1, 
				gid: 1,
				rdev: 0,
				size: (obj && obj.size)?obj.size:0,
				blksize: 4096,
				blocks: 8,
				atime: (obj && obj.creation_time)?obj.creation_time:0,
				mtime: (obj && obj.creation_time)?obj.creation_time:0,
				ctime: (obj && obj.creation_time)?obj.creation_time:0,
				birthtime: (obj && obj.creation_time)?obj.creation_time:0,
				isFile: function(){
					return (obj && obj.type && (obj.type != "folder"));
				},
				isDirectory: function(){
					return (obj && obj.type && (obj.type == "folder"));
				},
				isBlockDevice: function(){
					return false;
				},
				isCharacterDevice: function(){ return false;},
				isSymbolicLink: function(){ return false;},
				isFIFO: function(){ return false;},
				isSocket: function(){ return false;}
			}
			for (var prop in sobj) {
				obj[prop] = sobj[prop];
			}	
			return obj
		},

		stat: function(path, callback){
			//console.log("STAT: ", path);
			var obj = statCache[path];
			if (path == "/"){
				callback(null, fs.buildStatObj({
					uid: 1,
				 	type: "folder",
					path: "/",
					name: "WORKSPACES",
					creation_time: new Date(0).toISOString()
				}));
				return;
			}

			if (!obj) {
				when(wsGet(path,true), function(obj){
					//console.log(" STAT META: ", obj);
					callback(null, fs.buildStatObj(obj))
				}, function(err){
					console.log("STAT ERROR: ", err);
					callback(err);
				});

				return;
			}

			callback(null, fs.buildStatObj(obj));
		},
		createWriteStream: function(path, options){
		//writeFile: function(path, data){
			var options,callback;
			if (arguments.length==3){
				callback=arguments[2];
				options = {}
			}else if (arguments.length==4) {
				options = arguements[2];
				callback=arguments[3];
			}	
			console.log("createWriteStream()", path, options);
			var parsed = Path.parse(path);
			console.log("Write to: ", path);	
			WriteStream.prototype.destroySoon = PassThrough.prototype.end;

			var ws = new WriteStream();

			var uploadURL;
			var filename;
			var chunkIndex=1
			var sendBuffer;
			var minChunkSize=250000;

			ws._write = function(chunk,encoding,callback){
				var _self=this;	
				if (!sendBuffer){
					sendBuffer=chunk;
				}else{
					sendBuffer = Buffer.concat([sendBuffer,chunk],sendBuffer.length + chunk.length);
				}
			 	if (sendBuffer && (sendBuffer.length < minChunkSize)){
					callback();
					return;
				}
				var data = sendBuffer;
				sendBuffer=null;
	
				when(initDef, function(){
					console.log("WriteStream():  PUSH Chunk from WriteStream to ReadStream");
					console.log("uploadURL: ", uploadURL);
					console.log("filename: ", filename, " Chunk: ", chunkIndex, "Chunk Size: ", data.length);
	
					var form = {}
					form[chunkIndex++]={value: data, options: {filename: filename, contentType: "application/octet-stream"}, "content-length":data.length}
					var upr = request({method: "PUT",formData: form, url: uploadURL, preambleCRLF: true, postambleCRLF: true, headers:  {"Authorization": "OAuth " +token, "content-type": "multipart/form-data" }}, function(err,response,body){
						if (err) { console.log("Upload Err: ", err); callback(err); return; }
						console.log("Chunk Uploaded: ", body);
						callback();
						console.log("WriteStream.ended: ", _self._writableState.ended, " WriteStream.finished: ", _self._writableState.finished);
					})
				});
			}

			var finishUpload = function(uploadURL,evt) {
				var form = {parts: "close"}
				var upr = request({method: "PUT",formData: form, url: uploadURL, preambleCRLF: true, postambleCRLF: true, headers:  {"Authorization": "OAuth " +token, "content-type": "multipart/form-data" }}, function(err,response,body){
					if (err) { console.log("Upload Err: ", err); return; }
					console.log("All Chunks Uploaded.  Total Chunks for path: ", path, " : ", chunkIndex);
					ws.emit("close",evt);

				})

			}

			ws.on("finish", function(evt){
				console.log("WriteStream.ended: ", ws._writableState.ended, " WriteStream.finished: ", ws._writableState.finished);
				when(initDef, function(){
					if (sendBuffer && sendBuffer.length>0) {
						console.log("Drain final sendBuffer");
						var form = {}
						form[chunkIndex++]={value: sendBuffer, options: {filename: filename, contentType: "application/octet-stream"}, "content-length":sendBuffer.length}
						sendBuffer=null;
						var upr = request({method: "PUT",formData: form, url: uploadURL, preambleCRLF: true, postambleCRLF: true, headers:  {"Authorization": "OAuth " +token, "content-type": "multipart/form-data" }}, function(err,response,body){
							if (err) { console.log("Upload Err: ", err);  return; }
							console.log("Chunk Uploaded: ", body);
							finishUpload(uploadURL,evt);	
						})
					}else{
						finishUpload(uploadURL,evt);
					}
				});

			});

			var obj ={	
				path: parsed.dir,
				name: parsed.base,
				type: typeFromExtension(parsed.ext)
			}

			var initDef = when(wsCreate(obj,true), function(results){
				console.log("wsCreate: ", results);
				uploadURL = results.link_reference;
				filename = results.name;
				var form = { parts: "unknown" }
				var upr = request({method: "PUT",formData: form, url: uploadURL, preambleCRLF: true, postambleCRLF: true, headers:  {"Authorization": "OAuth " +token, "content-type": "multipart/form-data" }}, function(err,response,body){
					if (err) { console.log("Upload Err: ", err); return; }
					console.log("set parts to unknown ", body);
				});

			}, function(err){
				console.log("Error Creating File: ", err);
			});

			return ws;	
		},

		createReadStream: function(path, options){
			options = options || {};
			options.rpc = rpc;
			fs.wsGet = wsGet;
			options.fs = fs;

			var stat = statCache[path];

			if (!stat) {
				throw Error("Expected statCache to contain " + path);
			}

			if (stat.link_reference){
				return request({url: stat.link_reference + "?download", headers: {"Authorization": "OAuth " +token }});
			}else{
				return new WSReadStream(path, options);

			}
	
		},

		writeFile2: function(file, data, cb){
			console.log("file: ", file);
			console.log("data: ", data.length, data);
	
		},
		readFile: function(filename){ /* filename, [options,], callback */
			console.log("readFile not implemented yet");
		}
		
	}

	return fs;
}
