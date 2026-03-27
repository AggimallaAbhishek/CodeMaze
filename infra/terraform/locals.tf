locals {
  name_prefix      = "${var.project_name}-${var.environment}"
  api_domain_name  = "${var.api_subdomain}.${var.root_domain}"
  web_domain_name  = "${var.web_subdomain}.${var.root_domain}"
  web_origin_id    = "${local.name_prefix}-web-origin"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
