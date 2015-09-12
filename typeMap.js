var map = {
	".fa": "reads"	
}

module.exports = function(extension){
	if (map[extension]) {
		return map[extension];
	}

	return "unspecified";
}
