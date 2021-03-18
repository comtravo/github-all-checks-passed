## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| aws | n/a |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| region | AWS region | `string` | n/a | yes |
| api\_gateway\_name | Name of the API Gateway | `string` | `"all-checks-passed"` | no |
| api\_gateway\_stage | Name of the API Gateway stage | `string` | `"prod"` | no |
| domain\_settings | n/a | <pre>object({<br>    enable          = bool<br>    domain_name     = string<br>    zone_id         = string<br>    certificate_arn = string<br>    endpoint_type   = string<br>    security_policy = string<br>  })</pre> | <pre>{<br>  "certificate_arn": "",<br>  "domain_name": "",<br>  "enable": false,<br>  "endpoint_type": "",<br>  "security_policy": "",<br>  "zone_id": ""<br>}</pre> | no |
| github\_token\_key | GitHub Personal Access Token (PAT) | `string` | `"/infrastructure/github/pat"` | no |
| github\_webhook\_secret | GitHub webhook secret | `string` | `"/infrastructure/github/all-checks-passed/webhook-secret"` | no |
| iam\_path | IAM path | `string` | `"/"` | no |
| ignore\_checks | CSV GitHub checks to ignore | `string` | `""` | no |
| tags | Tags for AWS resources | `map` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| webhook | Webhook to add in GitHub |
