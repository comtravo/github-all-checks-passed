## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apig"></a> [apig](#module\_apig) | github.com/comtravo/terraform-aws-api-gateway-v2 | 1.3.0 |
| <a name="module_lambda"></a> [lambda](#module\_lambda) | github.com/comtravo/terraform-aws-lambda | 5.0.0 |

## Resources

| Name | Type |
|------|------|
| [aws_iam_role.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy_attachment.lambda_vpc_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_policy_document.ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_kms_alias.ssm](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/kms_alias) | data source |
| [aws_ssm_parameter.github_token_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |
| [aws_ssm_parameter.github_webhook_secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_api_gateway_name"></a> [api\_gateway\_name](#input\_api\_gateway\_name) | Name of the API Gateway | `string` | `"all-checks-passed"` | no |
| <a name="input_api_gateway_stage"></a> [api\_gateway\_stage](#input\_api\_gateway\_stage) | Name of the API Gateway stage | `string` | `"prod"` | no |
| <a name="input_domain_settings"></a> [domain\_settings](#input\_domain\_settings) | n/a | <pre>object({<br>    enable          = bool<br>    domain_name     = string<br>    zone_id         = string<br>    certificate_arn = string<br>    endpoint_type   = string<br>    security_policy = string<br>  })</pre> | <pre>{<br>  "certificate_arn": "",<br>  "domain_name": "",<br>  "enable": false,<br>  "endpoint_type": "",<br>  "security_policy": "",<br>  "zone_id": ""<br>}</pre> | no |
| <a name="input_github_token_key"></a> [github\_token\_key](#input\_github\_token\_key) | GitHub Personal Access Token (PAT) | `string` | `"/infrastructure/github/pat"` | no |
| <a name="input_github_webhook_secret"></a> [github\_webhook\_secret](#input\_github\_webhook\_secret) | GitHub webhook secret | `string` | `"/infrastructure/github/all-checks-passed/webhook-secret"` | no |
| <a name="input_iam_path"></a> [iam\_path](#input\_iam\_path) | IAM path | `string` | `"/"` | no |
| <a name="input_ignore_checks"></a> [ignore\_checks](#input\_ignore\_checks) | CSV GitHub checks to ignore | `string` | `""` | no |
| <a name="input_region"></a> [region](#input\_region) | AWS region | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Tags for AWS resources | `map` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_webhook"></a> [webhook](#output\_webhook) | Webhook to add in GitHub |
