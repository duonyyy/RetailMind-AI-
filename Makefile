# ==============================================================================
# RetailMind AI — Monorepo Enterprise Orchestration Makefile
# Production 2026 Edition (NestJS Commerce Core + Python Agent + Next.js BFF)
# ==============================================================================

.PHONY: help docker-up docker-down docker-logs \
        dev-backend dev-agent dev-frontend dev-all \
        build-backend build-frontend build-all \
        test-backend test-agent test-all \
        lint-backend lint-agent lint-all \
        scan-secrets clean

help:
	@echo "======================================================================"
	@echo "RetailMind AI — Enterprise Development & Operations Commands"
	@echo "======================================================================"
	@echo "  make docker-up       Start infrastructure containers (Postgres, Redis, MinIO, Qdrant, Phoenix)"
	@echo "  make docker-down     Stop all infrastructure containers"
	@echo "  make docker-logs     Follow docker container logs"
	@echo "  make dev-backend     Start NestJS commerce backend in watch mode"
	@echo "  make dev-agent       Start Python LangGraph agent runtime with auto-reload"
	@echo "  make dev-frontend    Start Next.js frontend client with BFF proxy"
	@echo "  make test-backend    Execute NestJS Jest test suites"
	@echo "  make test-agent      Execute Python Pytest test suites"
	@echo "  make test-all        Execute all test suites across the monorepo"
	@echo "  make build-backend   Compile NestJS production build"
	@echo "  make build-frontend  Compile Next.js production build"
	@echo "  make build-all       Compile all production builds"
	@echo "  make scan-secrets    Audit staged git diff for leaked credentials"
	@echo "  make clean           Purge caches, build artifacts and temporary files"
	@echo "======================================================================"

# --- Infrastructure Orchestration (Docker Compose) ---
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# --- Development Servers ---
dev-backend:
	cd core-api && npm run start:dev

dev-agent:
	cd agent-system && uvicorn main:app --reload --port 8000

dev-frontend:
	cd web-client && npm run dev

# --- Build Commands ---
build-backend:
	cd core-api && npm run build

build-frontend:
	cd web-client && npm run build

build-all: build-backend build-frontend

# --- Test Commands ---
test-backend:
	cd core-api && npm test

test-agent:
	cd agent-system && pytest tests/ -v

test-all: test-backend test-agent

# --- Linting & Quality ---
lint-backend:
	cd core-api && npm run lint

lint-agent:
	cd agent-system && ruff check src/ tests/

lint-all: lint-backend lint-agent

# --- Security Governance ---
scan-secrets:
	@echo "Auditing staged changes for potential secret leakage..."
	@git diff --cached | grep -iE "api[_-]?key|secret|token|password" && echo "[WARNING] Detected suspicious secret tokens in staged files!" || echo "[PASSED] No suspicious credentials found."

# --- Clean Artifacts ---
clean:
	rm -rf core-api/dist
	rm -rf web-client/.next
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
