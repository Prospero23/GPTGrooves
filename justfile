set dotenv-load

diff *args:
    git diff {{args}} -- . ':(exclude)*.snapshot.js.snap' ':(exclude)package-lock.json'

initall *args:
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra
    terraform init {{args}}


plan environment *args:
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra
    territory="gpt-music-theorist"
    workspace="${territory}-{{environment}}"
    terraform workspace select "${workspace}"
    terraform plan {{args}} -var-file="config/{{environment}}.tfvars"

apply environment *args:
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra
    territory="gpt-music-theorist"
    workspace="${territory}-{{environment}}"
    terraform workspace select "${workspace}"
    if [[ "{{environment}}" != "prod" ]]; then
        terraform apply --input=false --auto-approve {{args}} -var-file="config/{{environment}}.tfvars"
    else
       terraform apply {{args}} -var-file="config/{{environment}}.tfvars"
    fi

generate:
    #!/usr/bin/env bash
    cd gpt_music_lambda
    # Try to source, if it doesn't work, skip
    source venv/bin/activate || true
    PYTHONPATH=src python src/music_generator/generator.py
