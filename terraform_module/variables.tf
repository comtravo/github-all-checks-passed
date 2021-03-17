variable "api_gateway_name" {
  type        = string
  description = "Name of the API Gateway"
  default     = "all-checks-passed"
}

variable "iam_path" {
  type        = string
  description = "IAM path"
  default     = "/"
}

variable "api_gateway_stage" {
  type        = string
  description = "Name of the API Gateway stage"
  default     = "prod"
}

variable "github_token_key" {
  type        = string
  default     = "/infrastructure/github/pat"
  description = "GitHub Personal Access Token (PAT)"
}

variable "github_webhook_secret" {
  type        = string
  default     = "/infrastructure/github/all-checks-passed/webhook-secret"
  description = "GitHub webhook secret"
}

variable "ignore_checks" {
  type        = string
  default     = ""
  description = "CSV GitHub checks to ignore"
}

variable "region" {
  type        = string
  default     = "eu-west-1"
  description = "AWS region"
}

variable "tags" {
  type        = map
  default     = {}
  description = "Tags for AWS resources"
}

variable "domain_settings" {
  type = object({
    enable          = bool
    domain_name     = string
    zone_id         = string
    certificate_arn = string
    endpoint_type   = string
    security_policy = string
  })
  default = {
    "certificate_arn": "",
    "domain_name": "",
    "enable": false,
    "endpoint_type": "",
    "security_policy": "",
    "zone_id": ""
  }
}
