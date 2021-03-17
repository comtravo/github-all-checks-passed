#!make

tf-docs:
	@cd terraform_module && docker run --rm -v $(PWD):/opt/ct -w /opt/ct cytopia/terraform-docs terraform-docs markdown --sort-by-required . > README.md
