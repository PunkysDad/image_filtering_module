#!/usr/bin/env bash
#
# One-time setup: creates the ECR repo, ECS cluster, CloudWatch log group,
# and ECS service for picmagIQ. Run once before the first deploy.
#
# Required: AWS CLI configured with appropriate permissions.
# Set AWS_ACCOUNT_ID before running:  export AWS_ACCOUNT_ID=123456789012
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="${ECR_REPO_NAME:-picmagiq}"
ECS_CLUSTER_NAME="${ECS_CLUSTER_NAME:-picmagiq-cluster}"
ECS_SERVICE_NAME="${ECS_SERVICE_NAME:-picmagiq-service}"
LOG_GROUP="/ecs/picmagiq"

if [[ -z "${AWS_ACCOUNT_ID:-}" ]]; then
  echo "error: AWS_ACCOUNT_ID is required. Export it before running this script." >&2
  exit 1
fi

echo "==> Creating ECR repository: ${ECR_REPO_NAME}"
aws ecr create-repository \
  --region "${AWS_REGION}" \
  --repository-name "${ECR_REPO_NAME}" \
  --image-scanning-configuration scanOnPush=true \
  2>/dev/null || echo "    (already exists)"

echo "==> Creating ECS cluster: ${ECS_CLUSTER_NAME}"
aws ecs create-cluster \
  --region "${AWS_REGION}" \
  --cluster-name "${ECS_CLUSTER_NAME}" \
  --capacity-providers FARGATE \
  2>/dev/null || echo "    (already exists)"

echo "==> Creating CloudWatch log group: ${LOG_GROUP}"
aws logs create-log-group \
  --region "${AWS_REGION}" \
  --log-group-name "${LOG_GROUP}" \
  2>/dev/null || echo "    (already exists)"

echo "==> Creating SSM parameters (empty placeholders — fill these in the AWS console)"
for param in \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  SUPABASE_SECRET_KEY \
  ANTHROPIC_API_KEY \
  STRIPE_SECRET_KEY \
  STRIPE_WEBHOOK_SECRET \
  STRIPE_BASIC_PRICE_ID \
  STRIPE_PREMIUM_PRICE_ID \
  NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID \
  NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID \
  NEXT_PUBLIC_APP_URL; do
  aws ssm put-parameter \
    --region "${AWS_REGION}" \
    --name "/picmagiq/${param}" \
    --value "PLACEHOLDER" \
    --type "SecureString" \
    --overwrite \
    2>/dev/null || true
  echo "    /picmagiq/${param}"
done

echo "==> Registering initial task definition"
aws ecs register-task-definition \
  --region "${AWS_REGION}" \
  --cli-input-json file://infra/task-definition.json \
  > /dev/null

echo
echo "Setup complete. Next steps:"
echo "  1. Fill in SSM parameters in the AWS console (Systems Manager > Parameter Store)"
echo "  2. Update <AWS_ACCOUNT_ID> in infra/task-definition.json"
echo "  3. Create a Fargate service in the ECS console:"
echo "     - Cluster: ${ECS_CLUSTER_NAME}"
echo "     - Service: ${ECS_SERVICE_NAME}"
echo "     - Task definition: picmagiq"
echo "     - Launch type: FARGATE"
echo "     - Desired tasks: 1"
echo "     - Public IP: enabled"
echo "     - Port: 3000"
echo "  4. Create a CloudFront distribution pointing to the Fargate public IP"
echo "  5. Run: chmod +x deploy.sh && ./deploy.sh"

echo
echo "IAM note: ensure ecsTaskExecutionRole has the following policies attached:"
echo "  - AmazonECSTaskExecutionRolePolicy (AWS managed)"
echo "  - A custom policy allowing ssm:GetParameters and ssm:GetParameter"
echo "    on arn:aws:ssm:us-east-1:${AWS_ACCOUNT_ID}:parameter/picmagiq/*"
