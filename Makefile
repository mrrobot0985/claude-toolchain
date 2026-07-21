.PHONY: test build act-ci act-release act-release-dry help

test:
	npm test

build:
	npm run build

## Run CI workflow locally with act
act-ci:
	act push -e .act-events/push-main.json -W .github/workflows/ci.yml

## Run release workflow locally with act (dry-run, no actual publish)
act-release-dry:
	act workflow_dispatch -e .act-events/workflow-dispatch-release.json -W .github/workflows/release.yml --env DRY_RUN=true

## Run release workflow locally with act (requires NPM_TOKEN secret)
act-release:
	act workflow_dispatch -e .act-events/workflow-dispatch-release.json -W .github/workflows/release.yml -s NPM_TOKEN=$(NPM_TOKEN)

help:
	@echo "Available targets:"
	@echo "  make test                - Run tests locally"
	@echo "  make build               - Build the package"
	@echo "  make act-ci              - Dry-run CI workflow with act"
	@echo "  make act-release-dry     - Dry-run release workflow (no publish)"
	@echo "  make act-release         - Run release workflow with act (requires NPM_TOKEN)"
