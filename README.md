# Getting Started

# Install

## Precommit

pre-commit install

### Run all pre-commit hooks

pre-commit run --all-files

# Update Secrets Baseline

So the detect-secrets hook knows what's allowed, what's not. We occasionally want to update our "ignore list"

    detect-secrets scan > .secrets.baseline

# Deploy

```
just plan dev

# Look at planned changes

just apply dev
```

Or replace dev with { dev, staging, prod }

# Set up your Environment

Get API keys and place them in respective keys (defined in music_generator_lambda/.env.example)

https://platform.openai.com/
https://www.anyscale.com/
