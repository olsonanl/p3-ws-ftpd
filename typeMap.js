var map = {
	".fa": "reads",
	".fasta": "reads",
	".fq": "reads",
	".fastq": "read",
	".fasta.gz": "reads"
}

module.exports = function(extension){
	if (map[extension]) {
		return map[extension];
	}

	return "unspecified";
}
