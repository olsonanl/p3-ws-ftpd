var request = require('request');
var defer = require("promised-io/promise").defer;

module.exports = function(workspaceURL, username, token, UIDMap) {
	var idx=1;
	var UIDidx = 100;

	var rpc = function(method, params, options){
		var def = new defer();
		var reqBody = {id:idx++, method:method, params:params, jsonrpc: "2.0"};
		console.log("RPC Req Body: ", JSON.stringify(reqBody,null,4));
 
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
			console.log("RPC Body: ", body);
//			console.log("RES: ", res);

			if (err || body.error){
				return def.reject(err || body.error);
			}

			def.resolve(body.result);
		});

		return def.promise;
	}

	var statCache = {}

	return {
		readdir: function(path, callback) {
			console.log("READDIR from : ", path);

			rpc("Workspace.ls", [{
				paths: [path],
				includeSubDirs: false,
				recursive: false
			}]).then(function(results){
				if (!results || ! results[0] || !results[0][path]) {
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
					statCache[d.path] = d;

					if (UIDMap && UIDMap.byOwner && UIDMap.byOwner[d.owner_id]) {
						d.uid = UIDMap.byOwner[d.owner_id] 
					}else{
						d.uid = UIDidx;
						UIDMap.byOwner[d.owner_id] = UIDidx
						UIDMap.uid[UIDidx] = d.owner_id;
						UIDidx+=1;
					}
					return d.name
				});
				console.log("DIRECTORY LISTING for ", path, ": ",  flist);
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
				console.log("Delete Results: ", results);
				callback()
			}, function(err){
				callback(err);
			});
	
		},
		mkdir: function(path){  /* path,[mode,]callback */

		},
		open: function(path,flags){  /* path,flags, [mode,] callback */
			console.log("open()");
		},

		close: function(fd,callback){

		},
		rmdir: function(path, callback){

		},
		rename: function(oldpath,newpath,callback){

		},
		stat: function(path, callback){
			var obj = statCache[path];
			console.log("stat: ", path, obj);
			if (!obj) {
				callback("Unable to stat: " + path);
				return;
			}
			var sobj = {
				dev: 1,
				ino: 1,
				mode: 33188,
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

			callback(null, sobj);
		},
		createWriteStream: function(path, options){
			console.log("createWriteStream()");
		},

		createReadStream: function(path, options){
			console.log("createReadStream()");
		},

		readFile: function(filename){ /* filename, [options,], callback */

		}
		
	}
}
