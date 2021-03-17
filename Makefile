#!make

tf-docs:
	@docker run --rm -v $(PWD):/opt/ct -w /opt/ct/terraform_module cytopia/terraform-docs terraform-docs markdown --sort-by-required . > terraform_module/README.md

tf-fmt:
	@docker run --rm -v $(PWD):/opt/ct -w /opt/ct hashicorp/terraform:0.13.5 fmt -recursive

all: tf-fmt tf-docs
