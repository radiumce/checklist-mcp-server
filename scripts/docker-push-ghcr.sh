#!/bin/bash

# Docker Push to GitHub Container Registry Script
# 将 Docker 镜像推送到 GitHub Container Registry (ghcr.io)

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Push Docker Image to GHCR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo -e "Image: ${YELLOW}${IMAGE_NAME}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo ""

# Step 1: Check if local image exists
echo -e "${GREEN}[1/5] Checking local image...${NC}"
if docker images checklist-mcp-server:latest -q | grep -q .; then
    echo -e "${GREEN}✓ Local image found${NC}"
else
    echo -e "${RED}✗ Local image not found${NC}"
    echo -e "${YELLOW}Please build the image first:${NC}"
    echo -e "  docker build -t checklist-mcp-server:latest ."
    exit 1
fi
echo ""

# Step 2: Check GitHub CLI or prompt for manual login
echo -e "${GREEN}[2/5] Checking authentication...${NC}"
if command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI detected. Attempting automatic login...${NC}"
    if gh auth status &> /dev/null; then
        echo -e "${GREEN}✓ Already authenticated with GitHub CLI${NC}"
        echo -e "${YELLOW}Logging in to GHCR...${NC}"
        gh auth token | docker login ghcr.io -u ${GITHUB_USER} --password-stdin
    else
        echo -e "${YELLOW}Please authenticate with GitHub CLI first:${NC}"
        echo -e "  gh auth login"
        exit 1
    fi
else
    echo -e "${YELLOW}GitHub CLI not found. Please login manually:${NC}"
    echo -e "${YELLOW}You need a GitHub Personal Access Token with 'write:packages' permission${NC}"
    echo -e ""
    echo -e "To create a token:"
    echo -e "  1. Go to https://github.com/settings/tokens/new"
    echo -e "  2. Select 'write:packages' and 'read:packages' scopes"
    echo -e "  3. Generate token and copy it"
    echo -e ""
    echo -e "${YELLOW}Now running: docker login ghcr.io${NC}"
    docker login ghcr.io -u ${GITHUB_USER}
fi
echo ""

# Step 3: Tag images
echo -e "${GREEN}[3/5] Tagging images...${NC}"
docker tag checklist-mcp-server:latest ${IMAGE_NAME}:latest
echo -e "${GREEN}✓ Tagged as ${IMAGE_NAME}:latest${NC}"

docker tag checklist-mcp-server:latest ${IMAGE_NAME}:${VERSION}
echo -e "${GREEN}✓ Tagged as ${IMAGE_NAME}:${VERSION}${NC}"

docker tag checklist-mcp-server:latest ${IMAGE_NAME}:v${VERSION}
echo -e "${GREEN}✓ Tagged as ${IMAGE_NAME}:v${VERSION}${NC}"
echo ""

# Step 4: Push images
echo -e "${GREEN}[4/5] Pushing images to GHCR...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"
echo ""

echo -e "Pushing ${YELLOW}${IMAGE_NAME}:latest${NC}..."
docker push ${IMAGE_NAME}:latest
echo -e "${GREEN}✓ Pushed latest${NC}"
echo ""

echo -e "Pushing ${YELLOW}${IMAGE_NAME}:${VERSION}${NC}..."
docker push ${IMAGE_NAME}:${VERSION}
echo -e "${GREEN}✓ Pushed ${VERSION}${NC}"
echo ""

echo -e "Pushing ${YELLOW}${IMAGE_NAME}:v${VERSION}${NC}..."
docker push ${IMAGE_NAME}:v${VERSION}
echo -e "${GREEN}✓ Pushed v${VERSION}${NC}"
echo ""

# Step 5: Verify
echo -e "${GREEN}[5/5] Verifying push...${NC}"
echo -e "Image successfully pushed to:"
echo -e "  ${YELLOW}${IMAGE_NAME}:latest${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:${VERSION}${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:v${VERSION}${NC}"
echo ""

# Display usage information
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Push Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Your image is now available at:"
echo -e "  ${GREEN}https://github.com/${GITHUB_USER}/${REPO_NAME}/pkgs/container/${REPO_NAME}${NC}"
echo ""
echo -e "To pull the image:"
echo -e "  ${YELLOW}docker pull ${IMAGE_NAME}:latest${NC}"
echo -e "  ${YELLOW}docker pull ${IMAGE_NAME}:${VERSION}${NC}"
echo ""
echo -e "To run the image:"
echo -e "  ${YELLOW}docker run -d -p 8585:8585 ${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "To make the package public (if needed):"
echo -e "  1. Go to https://github.com/${GITHUB_USER}?tab=packages"
echo -e "  2. Click on '${REPO_NAME}'"
echo -e "  3. Click 'Package settings'"
echo -e "  4. Scroll down and click 'Change visibility'"
echo -e "  5. Select 'Public'"
echo ""
