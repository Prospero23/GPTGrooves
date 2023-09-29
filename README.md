# Getting Started

# Install

## Precommit

pre-commit install
pre-commit install --hook-type pre-push

### Now hand-add git-lfs

Because pre-commit wipes out git-lfs, we need to make sure they coexist.

    echo 'command -v git-lfs >/dev/null 2>&1 || { echo >&2 "\nThis repository is configured for Git LFS but '"'"'git-lfs'"'"' was not found on your path. If you no longer wish to use Git LFS, remove this hook by deleting '"'"'.git/   hooks/pre-push'"'"'.\n"; exit 2; }\ngit lfs pre-push "$@"' >> .git/hooks/pre-push.2

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


## Cacheing for Langchain

Add this line to your .env:

    llm_cache_filename="langchain.db"
