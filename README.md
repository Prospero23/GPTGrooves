# Getting Started

## Precommit

pre-commit install

### Run all pre-commit hooks

pre-commit run --all-files

# Update Secrets Baseline

So the detect-secrets hook knows what's allowed, what's not. We occasionally want to update our "ignore list"

    detect-secrets scan > .secrets.baseline


## Run Music Generator

Use poetry
