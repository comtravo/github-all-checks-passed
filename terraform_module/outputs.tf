locals {
  webhook = var.domain_settings.enable == true ? "https://${var.domain_settings.enable}/${var.api_gateway_stage}/github-webhook" : "${module.apig.aws_apigatewayv2_stage.invoke_url}/github-webhook"
}

output "webhook" {
  description = "Webhook to add in GitHub"
  value       = local.webhook
}
