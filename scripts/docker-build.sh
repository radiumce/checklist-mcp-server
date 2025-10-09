#!/bin/bash

# Docker Build Script for Checklist MCP Server
# This script builds and optionally tests the Docker image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="checklist-mcp-server"
IMAGE_TAG="latest"
BUILD_ONLY=false
SKIP_TEST=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --skip-test)
      SKIP_TEST=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --tag TAG          Set image tag (default: latest)"
      echo "  --name NAME        Set image name (default: checklist-mcp-server)"
      echo "  --build-only       Only build, don't run test container"
      echo "  --skip-test        Skip health check test"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building Docker Image${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Image: ${YELLOW}${FULL_IMAGE_NAME}${NC}"
echo ""

# Build the image
echo -e "${GREEN}Step 1: Building image...${NC}"
docker build -t "${FULL_IMAGE_NAME}" .

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Build successful!${NC}"
echo ""

# Show image size
echo -e "${GREEN}Step 2: Image information${NC}"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

if [ "$BUILD_ONLY" = true ]; then
  echo -e "${GREEN}Build complete! (--build-only flag set)${NC}"
  exit 0
fi

# Test the image
if [ "$SKIP_TEST" = false ]; then
  echo -e "${GREEN}Step 3: Testing image...${NC}"
  
  # Start test container
  TEST_CONTAINER_NAME="checklist-mcp-test-$$"
  TEST_PORT=$((8585 + RANDOM % 1000))
  
  echo -e "Starting test container on port ${YELLOW}${TEST_PORT}${NC}..."
  docker run -d \
    --name "${TEST_CONTAINER_NAME}" \
    -p "${TEST_PORT}:8585" \
    "${FULL_IMAGE_NAME}"
  
  # Wait for container to be ready
  echo -n "Waiting for server to start"
  for i in {1..30}; do
    if docker exec "${TEST_CONTAINER_NAME}" node -e "require('http').get('http://localhost:8585/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
      echo ""
      echo -e "${GREEN}✓ Server is healthy!${NC}"
      break
    fi
    echo -n "."
    sleep 1
    
    if [ $i -eq 30 ]; then
      echo ""
      echo -e "${RED}✗ Server failed to start within 30 seconds${NC}"
      echo -e "${YELLOW}Container logs:${NC}"
      docker logs "${TEST_CONTAINER_NAME}"
      docker stop "${TEST_CONTAINER_NAME}" >/dev/null 2>&1
      docker rm "${TEST_CONTAINER_NAME}" >/dev/null 2>&1
      exit 1
    fi
  done
  
  # Test health endpoint
  echo -e "Testing health endpoint..."
  HEALTH_RESPONSE=$(curl -s "http://localhost:${TEST_PORT}/health")
  
  if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
    echo -e "Response: ${YELLOW}${HEALTH_RESPONSE}${NC}"
  else
    echo -e "${RED}✗ Health check failed!${NC}"
    echo -e "Response: ${YELLOW}${HEALTH_RESPONSE}${NC}"
  fi
  
  # Cleanup test container
  echo -e "Cleaning up test container..."
  docker stop "${TEST_CONTAINER_NAME}" >/dev/null 2>&1
  docker rm "${TEST_CONTAINER_NAME}" >/dev/null 2>&1
  echo -e "${GREEN}✓ Cleanup complete!${NC}"
  echo ""
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Image: ${YELLOW}${FULL_IMAGE_NAME}${NC}"
echo ""
echo -e "To run the container:"
echo -e "  ${YELLOW}docker run -d -p 8585:8585 --name checklist-mcp-server ${FULL_IMAGE_NAME}${NC}"
echo ""
echo -e "To run with Docker Compose:"
echo -e "  ${YELLOW}docker-compose up -d${NC}"
echo ""
echo -e "For more information, see ${YELLOW}DOCKER.md${NC}"
