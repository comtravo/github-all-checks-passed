## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| archive | n/a |
| aws | n/a |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| api\_gateway\_name | Name of the API Gateway | `string` | `"all-checks-passed"` | no |
| api\_gateway\_stage | Name of the API Gateway stage | `string` | `"prod"` | no |
| github\_token\_key | GitHub Personal Access Token (PAT) | `string` | `"/infrastructure/github/pat"` | no |
| github\_webhook\_secret | GitHub webhook secret | `string` | `"/infrastructure/github/all-checks-passed/webhook-secret"` | no |
| iam\_path | IAM path | `string` | `"/"` | no |
| ignore\_checks | CSV GitHub checks to ignore | `string` | `"SonarCloud Code Analysis"` | no |
| region | AWS region | `string` | `"eu-west-1"` | no |
| tags | Tags for AWS resources | `map` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| webhook | Webhook to att in GitHub |
