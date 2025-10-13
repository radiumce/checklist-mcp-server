# Makefile for Checklist MCP Server Docker operations

.PHONY: help build run stop logs clean test compose-up compose-down compose-logs push build-multiplatform

# Default target
help:
	@echo "Checklist MCP Server - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build                - Build Docker image"
	@echo "  build-multiplatform  - Build and push multi-platform image (amd64, arm64)"
	@echo "  run                  - Run Docker container"
	@echo "  stop                 - Stop and remove Docker container"
	@echo "  logs                 - View container logs"
	@echo "  clean                - Remove image and container"
	@echo "  test                 - Build and test Docker image"
	@echo "  push                 - Push image to GitHub Container Registry"
	@echo "  compose-up           - Start with Docker Compose"
	@echo "  compose-down         - Stop Docker Compose"
	@echo "  compose-logs         - View Docker Compose logs"
	@echo "  shell                - Open shell in running container"
	@echo "  health               - Check container health"

# Build Docker image
build:
	@echo "Building Docker image..."
	docker build -t checklist-mcp-server:latest .

# Build and push multi-platform image
build-multiplatform:
	@echo "Building and pushing multi-platform image..."
	./scripts/docker-build-multiplatform.sh

# Run Docker container
run:
	@echo "Starting Docker container..."
	docker run -d \
		--name checklist-mcp-server \
		-p 8585:8585 \
		-e MAX_SESSIONS=100 \
		--restart unless-stopped \
		checklist-mcp-server:latest
	@echo "Container started on http://localhost:8585"

# Stop and remove container
stop:
	@echo "Stopping container..."
	-docker stop checklist-mcp-server
	-docker rm checklist-mcp-server
	@echo "Container stopped and removed"

# View logs
logs:
	docker logs -f checklist-mcp-server

# Clean up everything
clean: stop
	@echo "Removing image..."
	-docker rmi checklist-mcp-server:latest
	@echo "Cleanup complete"

# Build and test
test:
	@echo "Building and testing Docker image..."
	./scripts/docker-build.sh

# Push to GitHub Container Registry
push:
	@echo "Pushing image to GitHub Container Registry..."
	./scripts/docker-push-ghcr.sh

# Docker Compose up
compose-up:
	@echo "Starting with Docker Compose..."
	docker-compose up -d
	@echo "Service started"

# Docker Compose down
compose-down:
	@echo "Stopping Docker Compose..."
	docker-compose down
	@echo "Service stopped"

# Docker Compose logs
compose-logs:
	docker-compose logs -f

# Open shell in container
shell:
	docker exec -it checklist-mcp-server sh

# Check health
health:
	@echo "Checking container health..."
	@docker inspect --format='{{.State.Health.Status}}' checklist-mcp-server 2>/dev/null || echo "Container not running"
	@echo ""
	@echo "Testing health endpoint..."
	@curl -s http://localhost:8585/health | jq . || echo "Health endpoint not responding"

# Quick restart
restart: stop run

# View container stats
stats:
	docker stats checklist-mcp-server --no-stream
