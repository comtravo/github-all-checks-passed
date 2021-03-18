locals {
  webhook = var.domain_settings.enable == true ? "https://${var.domain_settings.domain_name}/github-webhook" : "${module.apig.aws_apigatewayv2_stage.invoke_url}/github-webhook"
}

output "webhook" {
  description = "Webhook to add in GitHub"
  value       = local.webhook
}
