#!/usr/bin/env bash
#
# Build and push the image-filter-platform Docker image to ECR, then roll
# the ECS service. Variables can be supplied via environment; anything
# missing will be prompted for interactively.
#
# Required vars:
#   AWS_REGION        e.g. us-east-1
#   AWS_ACCOUNT_ID    12-digit account id
#   ECR_REPO_NAME     e.g. image-filter-platform
#   ECS_CLUSTER_NAME  e.g. image-filter-cluster
#   ECS_SERVICE_NAME  e.g. image-filter-service

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

echo "==> Building image ${IMAGE_REPO}:${GIT_SHA}"
docker build \
  --platform linux/amd64 \
  -t "${IMAGE_REPO}:latest" \
  -t "${IMAGE_REPO}:${GIT_SHA}" \
  .

echo "==> Pushing ${IMAGE_REPO}:${GIT_SHA}"
docker push "${IMAGE_REPO}:${GIT_SHA}"

echo "==> Pushing ${IMAGE_REPO}:latest"
docker push "${IMAGE_REPO}:latest"

echo "==> Forcing new deployment on ${ECS_CLUSTER_NAME}/${ECS_SERVICE_NAME}"
aws ecs update-service \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER_NAME}" \
  --service "${ECS_SERVICE_NAME}" \
  --force-new-deployment \
  > /dev/null

echo
echo "Deploy complete."
echo "  Image: ${IMAGE_REPO}:${GIT_SHA}"
echo "  Also tagged: ${IMAGE_REPO}:latest"
