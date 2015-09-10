var nconf = require('nconf');

var defaults =  {
	"ftpd_port": 2000,
	"authorizationURL": "https://user.patricbrc.org/authenticate",
	workspaceServiceURL:"http://p3.theseed.org/services/Workspace"
}

module.exports = nconf.argv().env().file("./p3-web.conf").defaults(defaults);


