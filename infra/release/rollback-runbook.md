# Rollback Runbook

## Trigger Conditions
- Elevated API 5xx or latency alarms after deploy.
- Smoke failures on auth, levels, session start, submission, leaderboard, or replay.
- Frontend asset regression that affects login, protected routing, or gameplay rendering.

## API / Worker Rollback
1. Identify the previous stable ECS task definition revisions for API and worker.
2. Update Terraform variables or deployment inputs to point `api_image` and `worker_image` back to the last stable image tags.
3. Apply Terraform for the affected environment.
4. Wait for ECS deployment to finish and confirm target health recovers on the ALB.
5. Run `python3 infra/scripts/smoke.py` against the rolled-back environment.

## Frontend Rollback
1. Identify the previous stable frontend artifact version in the deployment history.
2. Re-sync that artifact to the environment S3 bucket.
3. Invalidate the CloudFront distribution paths:
   - `/index.html`
   - `/assets/*`
4. Verify the login page and homepage load correctly from the CDN.

## Database / Cache Notes
- Do not restore RDS snapshots for an application-only rollback unless there was a destructive migration.
- Redis is treated as disposable cache state; allow it to repopulate after application rollback.

## Exit Criteria
- `healthz` and `readyz` return `200`.
- Smoke passes for auth, levels, session start, submission, leaderboard, and replay.
- Relevant CloudWatch alarms return to `OK`.
- Incident note is updated with rollback timestamp, operator, and restored versions.
