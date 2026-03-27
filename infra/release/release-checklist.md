# Release Checklist

## Before Deploy
- Confirm `main` is green on backend lint/tests, frontend lint/tests, desktop/mobile Playwright, bundle report, and Terraform validation.
- Confirm `apps/web/lighthouserc.json` assertions pass on `/`, `/login`, and `/levels`.
- Confirm container images for API and worker have been pushed to ECR with immutable tags.
- Confirm staging Terraform plan is reviewed and includes expected image/tag changes only.
- Confirm Secrets Manager values are present for Django, database, JWT, and Google OAuth settings.
- Confirm smoke user credentials are set for `infra/scripts/smoke.py`.

## Staging
- Run Terraform apply for the staging workspace.
- Build and upload the web bundle to the staging S3 bucket.
- Invalidate the staging CloudFront distribution.
- Run `python3 infra/scripts/smoke.py` against staging.
- Run baseline load test with `k6 run infra/load/k6-smoke.js`.
- Run DAST baseline against staging.
- Review CloudWatch dashboard and alarm state.

## Production
- Confirm staging smoke, load, and DAST checks passed on the same image/build revision.
- Re-run a Terraform plan for production and get approval.
- Apply Terraform for production.
- Upload the production web bundle and invalidate CloudFront.
- Run smoke checks against production immediately after deploy.
- Verify ALB 5xx, latency, ECS CPU, RDS CPU, and Redis CPU alarms remain in `OK`.

## After Deploy
- Record deployed git SHA, API image tag, worker image tag, and CloudFront invalidation id.
- Verify rollback artifacts are still available.
- Announce completion with smoke results and any watch items for the next 24 hours.
