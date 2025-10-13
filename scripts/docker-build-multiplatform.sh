#!/bin/bash

# Multi-platform Docker Build Script
# 构建支持多平台的 Docker 镜像（amd64, arm64）

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_USER="radiumce"
REPO_NAME="checklist-mcp-server"
VERSION="1.2.0"
REGISTRY="ghcr.io"
IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/${REPO_NAME}"
BUILDER_NAME="multiplatform-builder"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Multi-platform Docker Build${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo -e "Image: ${YELLOW}${IMAGE_NAME}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Platforms: ${YELLOW}linux/amd64, linux/arm64${NC}"
echo ""

# Step 1: Check Docker Buildx
echo -e "${GREEN}[1/6] Checking Docker Buildx...${NC}"
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}✗ Docker Buildx not found${NC}"
    echo -e "${YELLOW}Please update Docker to a version that includes Buildx${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Buildx is available${NC}"
echo ""

# Step 2: Create or use builder
echo -e "${GREEN}[2/6] Setting up builder...${NC}"
if docker buildx inspect ${BUILDER_NAME} &> /dev/null; then
    echo -e "${YELLOW}Builder '${BUILDER_NAME}' already exists, using it${NC}"
    docker buildx use ${BUILDER_NAME}
else
    echo -e "${YELLOW}Creating new builder '${BUILDER_NAME}'${NC}"
    docker buildx create --name ${BUILDER_NAME} --use
fi
docker buildx inspect --bootstrap
echo -e "${GREEN}✓ Builder ready${NC}"
echo ""

# Step 3: Login to GHCR
echo -e "${GREEN}[3/6] Logging in to GHCR...${NC}"
if command -v gh &> /dev/null; then
    if gh auth status &> /dev/null; then
        echo -e "${YELLOW}Using GitHub CLI for authentication${NC}"
        gh auth token | docker login ghcr.io -u ${GITHUB_USER} --password-stdin
    else
        echo -e "${YELLOW}Please login with GitHub CLI first:${NC}"
        echo -e "  gh auth login"
        exit 1
    fi
else
    echo -e "${YELLOW}GitHub CLI not found. Please login manually:${NC}"
    docker login ghcr.io -u ${GITHUB_USER}
fi
echo ""

# Step 4: Build and push multi-platform image
echo -e "${GREEN}[4/6] Building and pushing multi-platform image...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag ${IMAGE_NAME}:latest \
    --tag ${IMAGE_NAME}:${VERSION} \
    --tag ${IMAGE_NAME}:v${VERSION} \
    --push \
    --progress=plain \
    .

echo ""
echo -e "${GREEN}✓ Multi-platform build and push complete${NC}"
echo ""

# Step 5: Verify images
echo -e "${GREEN}[5/6] Verifying pushed images...${NC}"
echo -e "${YELLOW}Checking manifest for linux/amd64...${NC}"
docker buildx imagetools inspect ${IMAGE_NAME}:latest | grep -A 2 "linux/amd64"
echo ""
echo -e "${YELLOW}Checking manifest for linux/arm64...${NC}"
docker buildx imagetools inspect ${IMAGE_NAME}:latest | grep -A 2 "linux/arm64"
echo ""
echo -e "${GREEN}✓ Both platforms verified${NC}"
echo ""

# Step 6: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Multi-platform images pushed to:"
echo -e "  ${YELLOW}${IMAGE_NAME}:latest${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:${VERSION}${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:v${VERSION}${NC}"
echo ""
echo -e "Supported platforms:"
echo -e "  ${GREEN}✓ linux/amd64${NC} (Intel/AMD x86_64)"
echo -e "  ${GREEN}✓ linux/arm64${NC} (ARM 64-bit)"
echo ""
echo -e "Users can now pull on any platform:"
echo -e "  ${YELLOW}docker pull ${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "Windows users can run:"
echo -e "  ${YELLOW}docker run -d -p 8585:8585 --cpus=\"1.0\" --memory=\"512m\" ${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "View on GitHub:"
echo -e "  ${YELLOW}https://github.com/${GITHUB_USER}/${REPO_NAME}/pkgs/container/${REPO_NAME}${NC}"
echo ""
