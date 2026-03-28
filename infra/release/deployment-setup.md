# Deployment Setup Guide

This guide covers what still has to be configured outside the repo so the staging and production workflows can run successfully.

## What Is Already Implemented

- Terraform scaffold for AWS networking, ECS, RDS, Redis, CloudFront, Route53, ACM, Secrets Manager, alarms, and dashboards.
- GitHub Actions workflows for:
  - Terraform validation
  - CI
  - staging deploy
  - production deploy
- Django runtime contracts:
  - `/api/v1/healthz`
  - `/api/v1/readyz`
- Smoke/load/release assets:
  - `infra/scripts/smoke.py`
  - `infra/load/k6-smoke.js`
  - `infra/release/release-checklist.md`
  - `infra/release/rollback-runbook.md`

## What You Need To Do

There are four external setup areas you still own:

1. AWS account bootstrap
2. GitHub environment secrets
3. Google Cloud OAuth configuration
4. First staging deployment approval and validation

## Step 1: Prepare Environment Files

1. Copy:
   - `infra/terraform/staging.tfvars.example` -> `infra/terraform/staging.tfvars`
   - `infra/terraform/production.tfvars.example` -> `infra/terraform/production.tfvars`
2. Replace every placeholder value.
3. Keep `api_image` and `worker_image` as placeholders only for the initial ECR bootstrap step.
4. For free-tier-eligible staging RDS shapes, keep `db_backup_retention_period = 1` unless you intentionally need a higher-cost configuration.
5. Keep `db_engine_version` on a version that is actually offered in your AWS region and instance class. The current repo default is `16.13`, which is valid in `ap-south-1` for `db.t4g.micro`.

## Step 2: Create Terraform Remote State

You need one S3 bucket and one DynamoDB table before running remote Terraform from CI.

### S3 state bucket

Create a versioned S3 bucket in `ap-south-1`.

Recommended name:

```text
codemaze-terraform-state-<account-id>
```

### DynamoDB lock table

Create a DynamoDB table with:

- Table name: `codemaze-terraform-locks`
- Partition key: `LockID` (String)

These values become GitHub secrets:

- `TF_STATE_BUCKET`
- `TF_STATE_LOCK_TABLE`

## Step 3: Create GitHub OIDC Roles In AWS

You need two IAM roles:

- one for staging
- one for production

### 3.1 Create GitHub as an IAM identity provider

In AWS IAM:

1. Open `IAM -> Identity providers -> Add provider`
2. Provider type: `OpenID Connect`
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`

### 3.2 Create the staging deploy role

1. Open `IAM -> Roles -> Create role`
2. Trusted entity type: `Web identity`
3. Identity provider: `token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Restrict the trust policy to your repo and the `staging` environment.

Use a trust policy like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<GITHUB_OWNER>/<GITHUB_REPO>:environment:staging"
        }
      }
    }
  ]
}
```

### 3.3 Create the production deploy role

Use the same setup, but scope it to:

```text
repo:<GITHUB_OWNER>/<GITHUB_REPO>:environment:production
```

### 3.4 Attach permissions

Both roles need permissions for:

- ECR push/pull
- ECS service/task updates
- ELB/Target Groups
- RDS/ElastiCache describe/update as required by Terraform
- Route53
- ACM
- CloudWatch
- SNS
- S3
- DynamoDB
- IAM pass role for ECS task roles
- Secrets Manager
- Terraform-managed VPC/network resources

Pragmatic approach:

- create a dedicated deploy policy for this stack
- attach it to both deploy roles

These role ARNs become GitHub secrets:

- `AWS_ROLE_TO_ASSUME_STAGING`
- `AWS_ROLE_TO_ASSUME_PRODUCTION`

## Step 4: Choose Domain and Route53 Values

You need:

- root domain, for example `codemaze.in`
- hosted zone id from Route53

The current Terraform setup expects:

- API hostname: `api.<root-domain>`
- Web hostname: `app.<root-domain>`

These become GitHub secrets:

- `ROOT_DOMAIN`
- `ROUTE53_ZONE_ID`

## Step 5: Bootstrap ECR Repositories Once

The deploy workflows build and push images before the full Terraform apply, so the ECR repos must exist first.

### 5.1 Why this bootstrap exists

Terraform owns the ECR repositories, but the CI pipeline also needs them before it can push the first image.

### 5.2 Run a targeted bootstrap apply for staging

From repo root:

```bash
cd infra/terraform
terraform init \
  -backend-config="bucket=<TF_STATE_BUCKET>" \
  -backend-config="key=codemaze/staging/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="dynamodb_table=<TF_STATE_LOCK_TABLE>"

terraform apply \
  -var-file=staging.tfvars \
  -target=aws_ecr_repository.api \
  -target=aws_ecr_repository.worker
```

### 5.3 Run the same bootstrap for production

```bash
terraform init \
  -backend-config="bucket=<TF_STATE_BUCKET>" \
  -backend-config="key=codemaze/production/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="dynamodb_table=<TF_STATE_LOCK_TABLE>"

terraform apply \
  -var-file=production.tfvars \
  -target=aws_ecr_repository.api \
  -target=aws_ecr_repository.worker
```

### 5.4 ECR repository names to use in GitHub

The workflows expect repository names, not full URIs.

Use:

- Staging API repo: `codemaze-staging-api`
- Staging worker repo: `codemaze-staging-worker`
- Production API repo: `codemaze-production-api`
- Production worker repo: `codemaze-production-worker`

If you keep the default `project_name = "codemaze"`, these names will match Terraform.

GitHub secrets should be:

- `API_ECR_REPOSITORY`
- `WORKER_ECR_REPOSITORY`

If you use different names per environment, store them in environment-specific GitHub secrets.

## Step 6: Add GitHub Environment Secrets

Create two GitHub environments:

- `staging`
- `production`

Then add these secrets.

### Shared secrets

| Secret | Meaning |
|---|---|
| `ROOT_DOMAIN` | Root Route53 domain |
| `ROUTE53_ZONE_ID` | Hosted zone id |
| `TF_STATE_BUCKET` | Terraform remote state bucket |
| `TF_STATE_LOCK_TABLE` | Terraform DynamoDB lock table |
| `API_ECR_REPOSITORY` | ECR repo name for API |
| `WORKER_ECR_REPOSITORY` | ECR repo name for worker |
| `GOOGLE_OAUTH_CLIENT_ID` | Google web OAuth client id |
| `ALERT_EMAIL` | Alarm notification email |
| `SMOKE_EMAIL` | Smoke account email |
| `SMOKE_USERNAME` | Smoke account username |
| `SMOKE_PASSWORD` | Smoke account password |

### Staging environment secrets

| Secret | Meaning |
|---|---|
| `AWS_ROLE_TO_ASSUME_STAGING` | AWS IAM role ARN for staging deploy |
| `DB_PASSWORD_STAGING` | Staging PostgreSQL password |
| `DJANGO_SECRET_KEY_STAGING` | Staging Django secret key |

### Production environment secrets

| Secret | Meaning |
|---|---|
| `AWS_ROLE_TO_ASSUME_PRODUCTION` | AWS IAM role ARN for production deploy |
| `DB_PASSWORD_PRODUCTION` | Production PostgreSQL password |
| `DJANGO_SECRET_KEY_PRODUCTION` | Production Django secret key |

## Step 7: Configure Google Cloud OAuth

The frontend uses Google Identity Services with a client-side credential callback. That means you need a Google OAuth **Web application** client id.

### 7.1 Create or select a Google Cloud project

1. Open Google Cloud Console
2. Create/select the project for CodeMaze

### 7.2 Configure the OAuth consent screen

1. Open `APIs & Services -> OAuth consent screen`
2. Set:
   - app name
   - support email
   - developer contact email
3. If the app is still in testing, add your Google account as a test user

### 7.3 Create the OAuth client

1. Open `APIs & Services -> Credentials`
2. Click `Create Credentials -> OAuth client ID`
3. Application type: `Web application`
4. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://app.<your-root-domain>` for staging if staging shares the same hostname pattern
   - `https://app.<your-root-domain>` for production

If staging and production use different frontend hostnames, add both exact origins.

### 7.4 What value to copy

Copy the **Client ID** only.

Use the same value for:

- backend secret: `GOOGLE_OAUTH_CLIENT_ID`
- frontend env: `VITE_GOOGLE_CLIENT_ID`

## Step 8: Validate Terraform Locally

Run:

```bash
make terraform-validate
```

If Terraform is not installed locally, install it first and rerun.

## Step 9: Run the Staging Workflow

After the AWS bootstrap and GitHub secrets are ready:

1. push the repo changes to `main`, or
2. trigger `Deploy Staging` manually from GitHub Actions

What the staging workflow does:

1. assumes the staging AWS role
2. builds API and worker images
3. pushes images to ECR
4. applies Terraform
5. builds the web app
6. uploads the web build to S3
7. invalidates CloudFront
8. runs smoke checks
9. runs a baseline k6 load probe
10. runs baseline DAST

## Step 10: Verify Staging

After staging deploy finishes:

1. Open the web URL from Terraform output
2. Confirm:
   - homepage loads
   - login works
   - register works
   - Google sign-in works
   - levels page loads
   - one sorting level can be started and submitted
   - leaderboard loads
   - replay loads
3. Open:
   - `/api/v1/healthz`
   - `/api/v1/readyz`
4. Review CloudWatch alarms and dashboard
5. Run the checklist in `infra/release/release-checklist.md`

## Step 11: Do One Rollback Drill Before Production

Follow:

```text
infra/release/rollback-runbook.md
```

Do this in staging first. Do not skip it.

## Step 12: Release Production

Only after staging is stable:

1. ensure production secrets are populated
2. ensure production ECR repos were bootstrapped
3. trigger the production workflow using a version tag or manual run
4. rerun smoke checks
5. verify alarms remain green

## Exact Things You Still Need To Do Yourself

1. Create AWS OIDC roles for GitHub Actions
2. Create the Terraform remote state bucket and DynamoDB lock table
3. Create/finalize the Route53 hosted zone and real domain
4. Fill `staging.tfvars` and `production.tfvars`
5. Bootstrap ECR repos once per environment
6. Add all GitHub environment secrets
7. Configure Google Cloud OAuth with your real frontend origins
8. Approve and trigger the first staging deploy
9. Review staging behavior and alarms
10. Approve production only after the staging rollback drill succeeds
