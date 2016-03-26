var map = {
	"fa": "reads",
	"fasta": "reads",
	"fq": "reads",
	"fastq": "reads",
	"tgz": "tar_gz"
}

var WorkspaceTypes = [
	"bam",
	"biochemistry",
	"contigs",
	"csv",
	"de_novo_assembled_transcripts",
	"diffexp_experiment",
	"diffexp_expression",
	"diffexp_input_data",
	"diffexp_input_metadata",
	"diffexp_mapping",
	"diffexp_sample",
	"doc",
	"docx",
	"embl",
	"experiment_group",
	"fba",
	"feature_dna_fasta",
	"feature_group",
	"feature_protein_fasta",
	"feature_table",
	"genbank_file",
	"genome",
	"genome_annotation_result",
	"genome_comparison_table",
	"genome_group",
	"gff",
	"gif",
	"html",
	"job_result",
	"jpg",
	"json",
	"mapping",
	"media",
	"model",
	"modelfolder",
	"model_edit",
	"modeltemplate",
	"pdf",
	"png",
	"ppt",
	"pptx",
	"proteomics_experiment",
	"reads",
	"rxnprobs",
	"string",
	"svg",
	"tar_gz",
	"transcriptomics_experiment",
	"transcripts",
	"txt",
	"vcf",
	"wig",
	"xls",
	"xlsx",
	"zip",
	"contigset"
]

WorkspaceTypes.forEach(function(type){
	if (!map[type]){
		map[type]=type;
	}
});

module.exports = function(filename){
	var parts = filename.split(".");

	var ext = parts[parts.length-1];

	if (ext == "gz" || ext == "bz2"){
		ext = parts[parts.length-2];
	}

	if (map[ext]) {
		return map[ext];
	}

	return "unspecified";
}
