output "api_base_url" {
  description = "API base URL."
  value       = "https://${local.api_domain_name}"
}

output "web_base_url" {
  description = "Web application base URL."
  value       = "https://${local.web_domain_name}"
}

output "web_bucket_name" {
  description = "S3 bucket used for the web deployment."
  value       = aws_s3_bucket.web.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id for cache invalidations."
  value       = aws_cloudfront_distribution.web.id
}

output "api_ecr_repository_url" {
  description = "ECR repository URL for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "worker_ecr_repository_url" {
  description = "ECR repository URL for the worker image."
  value       = aws_ecr_repository.worker.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}
