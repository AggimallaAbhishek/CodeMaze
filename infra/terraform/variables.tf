variable "project_name" {
  description = "Platform name used for AWS resource naming."
  type        = string
  default     = "codemaze"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "aws_region" {
  description = "Primary AWS region for the platform."
  type        = string
  default     = "ap-south-1"
}

variable "root_domain" {
  description = "Root domain managed by Route53."
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone id for the root domain."
  type        = string
}

variable "api_subdomain" {
  description = "API subdomain prefix."
  type        = string
  default     = "api"
}

variable "web_subdomain" {
  description = "Frontend subdomain prefix."
  type        = string
  default     = "app"
}

variable "alert_email" {
  description = "Optional email subscription for CloudWatch alarm notifications."
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public subnets for ALB/NAT."
  type        = list(string)
  default     = ["10.40.0.0/24", "10.40.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Two private subnets for ECS, RDS, and Redis."
  type        = list(string)
  default     = ["10.40.10.0/24", "10.40.11.0/24"]
}

variable "api_image" {
  description = "Full container image URI for the Django API."
  type        = string
}

variable "worker_image" {
  description = "Full container image URI for the Celery worker."
  type        = string
}

variable "api_cpu" {
  description = "Fargate CPU units for the API task."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task."
  type        = number
  default     = 1024
}

variable "worker_cpu" {
  description = "Fargate CPU units for the worker task."
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "Fargate memory (MiB) for the worker task."
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired API service task count."
  type        = number
  default     = 2
}

variable "worker_desired_count" {
  description = "Desired worker service task count."
  type        = number
  default     = 1
}

variable "api_container_port" {
  description = "Container port exposed by the API."
  type        = number
  default     = 8000
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "algorithm_puzzle"
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "algorithm_puzzle"
}

variable "db_password" {
  description = "PostgreSQL master password."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "RDS automated backup retention period in days."
  type        = number
  default     = null
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "django_secret_key" {
  description = "Django secret key stored in Secrets Manager."
  type        = string
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Google OAuth client id used by the API and frontend."
  type        = string
  sensitive   = true
}

variable "access_token_lifetime_minutes" {
  description = "JWT access token lifetime."
  type        = number
  default     = 15
}

variable "refresh_token_lifetime_days" {
  description = "JWT refresh token lifetime."
  type        = number
  default     = 7
}
