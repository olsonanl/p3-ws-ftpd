var map = {
	".fa": "contigs",
	".fasta": "contigs",
    ".fna": "contigs",
	".fq": "reads",
	".fastq": "reads",
	".fasta.gz": "reads",
    ".fq.gz": "reads",
    ".faa": "feature_protein_fasta"
}

module.exports = function(extension){
	if (map[extension]) {
		return map[extension];
	}

	return "unspecified";
}
