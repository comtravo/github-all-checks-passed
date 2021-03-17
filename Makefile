#!make

tf-docs:
	@docker run --rm -v $(PWD):/opt/ct -w /opt/ct/terraform_module cytopia/terraform-docs terraform-docs markdown --sort-by-required . > terraform_module/README.md
