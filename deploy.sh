#!/usr/bin/env bash
#
# Build and push the picmagIQ Docker image to ECR, then roll the ECS service.
# Variables can be supplied via environment; anything missing will be prompted.
#
# Required vars:
#   AWS_REGION        e.g. us-east-1
#   AWS_ACCOUNT_ID    12-digit account id
#   ECR_REPO_NAME     e.g. picmagiq
#   ECS_CLUSTER_NAME  e.g. picmagiq-cluster
#   ECS_SERVICE_NAME  e.g. picmagiq-service
set -euo pipefail

prompt_if_unset() {
  local var_name="$1"
  local prompt_text="$2"
  if [[ -z "${!var_name:-}" ]]; then
    read -r -p "${prompt_text}: " value
    if [[ -z "${value}" ]]; then
      echo "error: ${var_name} is required" >&2
      exit 1
    fi
    export "${var_name}=${value}"
  fi
}

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="${ECR_REPO_NAME:-picmagiq}"
ECS_CLUSTER_NAME="${ECS_CLUSTER_NAME:-picmagiq-cluster}"
ECS_SERVICE_NAME="${ECS_SERVICE_NAME:-picmagiq-service}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E2CXL1HH6EUYAB}"

prompt_if_unset AWS_REGION       "AWS_REGION (e.g. us-east-1)"
prompt_if_unset AWS_ACCOUNT_ID   "AWS_ACCOUNT_ID (12-digit account id)"
prompt_if_unset ECR_REPO_NAME    "ECR_REPO_NAME"
prompt_if_unset ECS_CLUSTER_NAME "ECS_CLUSTER_NAME"
prompt_if_unset ECS_SERVICE_NAME "ECS_SERVICE_NAME"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_REPO="${REGISTRY}/${ECR_REPO_NAME}"
GIT_SHA="$(git rev-parse --short HEAD)"

echo "==> Logging in to ECR (${REGISTRY})"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

echo "==> Fetching NEXT_PUBLIC vars from SSM"
SUPABASE_URL=$(aws ssm get-parameter \
  --region "${AWS_REGION}" \
  --name "/picmagiq/NEXT_PUBLIC_SUPABASE_URL" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

SUPABASE_KEY=$(aws ssm get-parameter \
  --region "${AWS_REGION}" \
  --name "/picmagiq/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

STRIPE_BASIC=$(aws ssm get-parameter \
  --region "${AWS_REGION}" \
  --name "/picmagiq/NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

STRIPE_PREMIUM=$(aws ssm get-parameter \
  --region "${AWS_REGION}" \
  --name "/picmagiq/NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

APP_URL=$(aws ssm get-parameter \
  --region "${AWS_REGION}" \
  --name "/picmagiq/NEXT_PUBLIC_APP_URL" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

echo "==> Building image ${IMAGE_REPO}:${GIT_SHA}"
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${SUPABASE_KEY}" \
  --build-arg NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID="${STRIPE_BASIC}" \
  --build-arg NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID="${STRIPE_PREMIUM}" \
  --build-arg NEXT_PUBLIC_APP_URL="${APP_URL}" \
  -t "${IMAGE_REPO}:latest" \
  -t "${IMAGE_REPO}:${GIT_SHA}" \
  .

echo "==> Pushing ${IMAGE_REPO}:${GIT_SHA}"
docker push "${IMAGE_REPO}:${GIT_SHA}"
echo "==> Pushing ${IMAGE_REPO}:latest"
docker push "${IMAGE_REPO}:latest"

echo "==> Registering task definition"
aws ecs register-task-definition \
  --region "${AWS_REGION}" \
  --cli-input-json file://infra/task-definition.json \
  > /dev/null

LATEST_TASK_DEF=$(aws ecs describe-task-definition \
  --region "${AWS_REGION}" \
  --task-definition "${ECS_CLUSTER_NAME%-cluster}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "==> Updating service to task definition: ${LATEST_TASK_DEF}"
aws ecs update-service \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER_NAME}" \
  --service "${ECS_SERVICE_NAME}" \
  --task-definition "${LATEST_TASK_DEF}" \
  --force-new-deployment \
  > /dev/null

DEPLOY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "==> Waiting for new task to reach RUNNING state (started after ${DEPLOY_START})..."
NEW_TASK_ARN=""
for i in $(seq 1 40); do
  ALL_TASKS=$(aws ecs list-tasks \
    --region "${AWS_REGION}" \
    --cluster "${ECS_CLUSTER_NAME}" \
    --service-name "${ECS_SERVICE_NAME}" \
    --desired-status RUNNING \
    --query 'taskArns' \
    --output json)
  for TASK in $(echo "${ALL_TASKS}" | python3 -c "import sys,json; [print(t) for t in json.load(sys.stdin)]"); do
    TASK_INFO=$(aws ecs describe-tasks \
      --region "${AWS_REGION}" \
      --cluster "${ECS_CLUSTER_NAME}" \
      --tasks "${TASK}" \
      --query 'tasks[0].{status:lastStatus,started:startedAt}' \
      --output json)
    STATUS=$(echo "${TASK_INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))")
    if [[ "${STATUS}" == "RUNNING" ]]; then
      NEW_TASK_ARN="${TASK}"
      echo "    New task is RUNNING: ${NEW_TASK_ARN}"
      break 2
    fi
  done
  echo "    Waiting... (${i}/40)"
  sleep 10
done

if [[ -z "${NEW_TASK_ARN}" ]]; then
  echo "ERROR: New task did not reach RUNNING state in time" >&2
  exit 1
fi

echo "==> Getting new task public IP"
ENI_ID=$(aws ecs describe-tasks \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER_NAME}" \
  --tasks "${NEW_TASK_ARN}" \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

NEW_IP=$(aws ec2 describe-network-interfaces \
  --region "${AWS_REGION}" \
  --network-interface-ids "${ENI_ID}" \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "==> New task IP: ${NEW_IP}"

echo "==> Waiting for new task to be reachable on port 3000..."
for i in $(seq 1 20); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${NEW_IP}:3000" || echo "000")
  if [[ "${HTTP_CODE}" == "200" ]]; then
    echo "    Task is reachable (HTTP ${HTTP_CODE})"
    break
  fi
  echo "    Not reachable yet (HTTP ${HTTP_CODE}), waiting... (${i}/20)"
  sleep 10
done

echo "==> Updating CloudFront origin to ${NEW_IP}.nip.io"
ETAG=$(aws cloudfront get-distribution-config \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --query 'ETag' \
  --output text)

aws cloudfront get-distribution-config \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --query 'DistributionConfig' \
  | sed "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.nip\.io/${NEW_IP}.nip.io/g" \
  > /tmp/dist-config.json

aws cloudfront update-distribution \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --if-match "${ETAG}" \
  --distribution-config "file:///tmp/dist-config.json" \
  > /dev/null

echo "==> CloudFront origin updated to ${NEW_IP}.nip.io"

echo
echo "Deploy complete."
echo "  Image: ${IMAGE_REPO}:${GIT_SHA}"
echo "  Also tagged: ${IMAGE_REPO}:latest"
