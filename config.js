var nconf = require('nconf');

var defaults =  {
	"ftpd_port": 2000,
	"authorizationURL": "https://user.patricbrc.org/authenticate",
	workspaceServiceURL:"http://p3.theseed.org/services/Workspace",
	"host": "walnut.mcs.anl.gov",
	"sslCaFile":"/homes/olson/P3/ftp/ca.cert.pem",
	"sslCertificateFile":"/homes/olson/P3/ftp/walnut.ftp.cert.pem",
	"sslCertificateKeyFile": "/homes/olson/P3/ftp/walnut.ftp.key.pem",
	"logLevel": 10,
	"tlsOnly": true
}

module.exports = nconf.argv().env().file("./p3-ws-ftpd.conf").defaults(defaults);


