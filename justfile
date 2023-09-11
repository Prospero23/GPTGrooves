set dotenv-load

export AWS_DEFAULT_OUTPUT := "json"
export AWS_PAGER := ""
export MUSIC_GENERATOR_IMAGE_NAME := "gpt-music-theorist-lambda"
export ECR_HOST := "387661842919.dkr.ecr.us-west-1.amazonaws.com"

diff *args:
    git diff {{args}} -- . ':(exclude)*.snapshot.js.snap' ':(exclude)package-lock.json'

initall *args:
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra
    terraform init {{args}}

ecr_login:
    aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin "${ECR_HOST}"

build_music_generator: (ecr_login)
    #!/usr/bin/env bash
    set -e
    set -o pipefail

    cd music_generator_lambda

    docker build --platform=linux/amd64 --file lambda.Dockerfile -t ${MUSIC_GENERATOR_IMAGE_NAME}:latest ./

    # This code is duplicated in this file. And concurrent-unsafe.
    HASH=$(docker images --no-trunc -q ${MUSIC_GENERATOR_IMAGE_NAME}:latest | sed -e 's/sha256://')
    SHORT_HASH=$(echo $HASH | cut -c 1-12) # Taking the first 12 characters
    MUSIC_GENERATOR_IMAGE_URI=${ECR_HOST}/${MUSIC_GENERATOR_IMAGE_NAME}:${SHORT_HASH}

    echo "Tagging ${MUSIC_GENERATOR_IMAGE_NAME}:latest as ${MUSIC_GENERATOR_IMAGE_URI}"

    docker tag ${MUSIC_GENERATOR_IMAGE_NAME}:latest ${MUSIC_GENERATOR_IMAGE_URI}
    docker push ${MUSIC_GENERATOR_IMAGE_URI}

plan environment *args: (build_music_generator)
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra

    HASH=$(docker images --no-trunc -q ${MUSIC_GENERATOR_IMAGE_NAME}:latest | sed -e 's/sha256://')
    SHORT_HASH=$(echo $HASH | cut -c 1-12) # Taking the first 12 characters
    MUSIC_GENERATOR_IMAGE_URI=${ECR_HOST}/${MUSIC_GENERATOR_IMAGE_NAME}:${SHORT_HASH}

    territory="gpt-music-theorist"
    workspace="${territory}-{{environment}}"
    terraform workspace select "${workspace}"
    terraform plan {{args}} -var-file="config/{{environment}}.tfvars" -var="music_generator_image_uri=${MUSIC_GENERATOR_IMAGE_URI}"

apply environment *args: (build_music_generator)
    #!/usr/bin/env bash
    set -e
    set -o pipefail
    cd infra

    HASH=$(docker images --no-trunc -q ${MUSIC_GENERATOR_IMAGE_NAME}:latest | sed -e 's/sha256://')
    SHORT_HASH=$(echo $HASH | cut -c 1-12) # Taking the first 12 characters
    MUSIC_GENERATOR_IMAGE_URI=${ECR_HOST}/${MUSIC_GENERATOR_IMAGE_NAME}:${SHORT_HASH}

    territory="gpt-music-theorist"
    workspace="${territory}-{{environment}}"
    terraform workspace select "${workspace}"
    if [[ "{{environment}}" != "prod" ]]; then
        terraform apply --input=false --auto-approve {{args}} -var-file="config/{{environment}}.tfvars" -var="music_generator_image_uri=${MUSIC_GENERATOR_IMAGE_URI}"
    else
       terraform apply {{args}} -var-file="config/{{environment}}.tfvars" -var="music_generator_image_uri=${MUSIC_GENERATOR_IMAGE_URI}"
    fi

generate:
    #!/usr/bin/env bash
    cd music_generator_lambda
    # Try to source, if it doesn't work, skip

    # This isn't how we do it any more!
    # poetry run python music_generator/generator.py

    # Instead, we invoke as modules (the right way)
    poetry run python -m music_generator.generator


invoke_generator environment:
    aws lambda invoke --region=us-west-1 --function-name gpt-music-theorist-{{ environment }}-music-generator /dev/null

tail_generator_logs environment:
    awslogs get /aws/lambda/gpt-music-theorist-{{ environment }}-music-generator --s15s --timestamp --watch
