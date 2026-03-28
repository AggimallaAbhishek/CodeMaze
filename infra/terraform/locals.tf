locals {
  name_prefix                = "${var.project_name}-${var.environment}"
  api_domain_name            = "${var.api_subdomain}.${var.root_domain}"
  web_domain_name            = "${var.web_subdomain}.${var.root_domain}"
  web_origin_id              = "${local.name_prefix}-web-origin"
  db_backup_retention_period = coalesce(var.db_backup_retention_period, var.environment == "production" ? 14 : 1)
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
