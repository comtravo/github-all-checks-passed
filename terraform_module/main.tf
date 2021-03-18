provider "aws" {
  region = var.region
}

data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

data "aws_ssm_parameter" "github_token_key" {
  name            = var.github_token_key
  with_decryption = false
}

data "aws_ssm_parameter" "github_webhook_secret" {
  name            = var.github_webhook_secret
  with_decryption = false
}

data "aws_iam_policy_document" "ssm" {
  statement {
    actions = [
      "ssm:DescribeParameters",
    ]

    resources = [
      "*",
    ]
  }

  statement {
    actions = [
      "kms:Decrypt",
      "ssm:GetParameters",
      "ssm:GetParameter",
    ]

    resources = [
      data.aws_ssm_parameter.github_token_key.arn,
      data.aws_ssm_parameter.github_webhook_secret.arn,
      data.aws_kms_alias.ssm.target_key_arn,
    ]
  }
}

resource "aws_iam_role" "this" {
  name = "lambda-iam-role-${var.api_gateway_name}"

  path                  = var.iam_path
  assume_role_policy    = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
            "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
    }
  ]
}
EOF
  force_detach_policies = true
}

resource "aws_iam_role_policy" "ssm" {
  name   = "github-token-ssm-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.ssm.json
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_policy" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

module "lambda" {
  source = "github.com/comtravo/terraform-aws-lambda?ref=5.0.0"

  file_name     = "${path.module}/lambda.zip"
  function_name = var.api_gateway_name
  handler       = "index.handler"
  role          = aws_iam_role.this.arn
  trigger = {
    type = "api-gateway"
  }
  environment = {
    "GITHUB_TOKEN_KEY_IN_SSM_PARAMETER_STORE"          = var.github_token_key
    "GITHUB_WEBHOOK_SECRET_KEY_IN_SSM_PARAMETER_STORE" = var.github_webhook_secret
    "IGNORE_CHECKS"                                    = var.ignore_checks
  }
  region = var.region
  tags   = var.tags
}

module "apig" {
  source = "github.com/comtravo/terraform-aws-api-gateway-v2?ref=395d224b441f325e96bfb8b5a258a7e205e9c073"

  name            = var.api_gateway_name
  stage           = var.api_gateway_stage
  domain_settings = var.domain_settings
  protocol_type   = "HTTP"
  tags            = var.tags
  body            = <<EOF
---
openapi: "3.0.1"
x-amazon-apigateway-importexport-version: "1.0"
paths:
  /github-webhook:
    post:
      responses:
        default:
          description: "Default response for POST /github-webhook"
      x-amazon-apigateway-integration:
        payloadFormatVersion: "2.0"
        type: "aws_proxy"
        httpMethod: "POST"
        uri: "${module.lambda.invoke_arn}"
        connectionType: "INTERNET"
EOF
}


