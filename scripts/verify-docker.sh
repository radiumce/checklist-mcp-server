#!/bin/bash

# Docker Verification Script for Checklist MCP Server
# This script verifies the Docker setup is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Docker Setup Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check 1: Docker installed
echo -e "${YELLOW}[1/7] Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker is installed: ${DOCKER_VERSION}${NC}"
else
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo ""

# Check 2: Docker daemon running
echo -e "${YELLOW}[2/7] Checking Docker daemon...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
else
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    exit 1
fi
echo ""

# Check 3: Dockerfile exists
echo -e "${YELLOW}[3/7] Checking Dockerfile...${NC}"
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓ Dockerfile found${NC}"
    echo -e "  Base image: $(grep '^FROM' Dockerfile | head -1)"
else
    echo -e "${RED}✗ Dockerfile not found${NC}"
    exit 1
fi
echo ""

# Check 4: .dockerignore exists
echo -e "${YELLOW}[4/7] Checking .dockerignore...${NC}"
if [ -f ".dockerignore" ]; then
    IGNORE_COUNT=$(wc -l < .dockerignore)
    echo -e "${GREEN}✓ .dockerignore found (${IGNORE_COUNT} lines)${NC}"
else
    echo -e "${YELLOW}⚠ .dockerignore not found (recommended)${NC}"
fi
echo ""

# Check 5: docker-compose.yml exists
echo -e "${YELLOW}[5/7] Checking docker-compose.yml...${NC}"
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓ docker-compose.yml found${NC}"
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓ docker-compose is installed${NC}"
    else
        echo -e "${YELLOW}⚠ docker-compose not installed (optional)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ docker-compose.yml not found${NC}"
fi
echo ""

# Check 6: Build scripts exist
echo -e "${YELLOW}[6/7] Checking build scripts...${NC}"
if [ -f "scripts/docker-build.sh" ]; then
    echo -e "${GREEN}✓ docker-build.sh found${NC}"
    if [ -x "scripts/docker-build.sh" ]; then
        echo -e "${GREEN}✓ docker-build.sh is executable${NC}"
    else
        echo -e "${YELLOW}⚠ docker-build.sh is not executable${NC}"
        echo -e "  Run: chmod +x scripts/docker-build.sh"
    fi
else
    echo -e "${YELLOW}⚠ docker-build.sh not found${NC}"
fi
echo ""

# Check 7: Documentation exists
echo -e "${YELLOW}[7/7] Checking documentation...${NC}"
DOCS_FOUND=0
if [ -f "DOCKER.md" ]; then
    echo -e "${GREEN}✓ DOCKER.md found${NC}"
    ((DOCS_FOUND++))
fi
if [ -f "DOCKER_QUICK_START.md" ]; then
    echo -e "${GREEN}✓ DOCKER_QUICK_START.md found${NC}"
    ((DOCS_FOUND++))
fi
if [ -f "DOCKER_SUMMARY.md" ]; then
    echo -e "${GREEN}✓ DOCKER_SUMMARY.md found${NC}"
    ((DOCS_FOUND++))
fi
if [ $DOCS_FOUND -eq 0 ]; then
    echo -e "${YELLOW}⚠ No Docker documentation found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Docker setup is ready!${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Build the image:"
echo -e "     ${YELLOW}make build${NC} or ${YELLOW}npm run docker:build${NC}"
echo -e ""
echo -e "  2. Run the container:"
echo -e "     ${YELLOW}make run${NC} or ${YELLOW}docker-compose up -d${NC}"
echo -e ""
echo -e "  3. Test the server:"
echo -e "     ${YELLOW}curl http://localhost:8585/health${NC}"
echo -e ""
echo -e "For more information, see:"
echo -e "  - ${YELLOW}DOCKER_QUICK_START.md${NC} - Quick start guide"
echo -e "  - ${YELLOW}DOCKER.md${NC} - Complete documentation"
echo -e "  - ${YELLOW}make help${NC} - Available make commands"
echo ""
