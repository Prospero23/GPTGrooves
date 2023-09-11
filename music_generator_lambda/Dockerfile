# Global ARG, available to all stages (if renewed)
ARG WORKDIR="/app"

FROM python:3.9 AS requirement_generator

# Renew (https://stackoverflow.com/a/53682110):
ARG WORKDIR

# From: https://github.com/python-poetry/poetry/issues/1178#issuecomment-1238475183
# And https://github.com/orgs/python-poetry/discussions/1879

# Don't buffer `stdout`:
ENV PYTHONUNBUFFERED=1
# Don't create `.pyc` files:
ENV PYTHONDONTWRITEBYTECODE=1

RUN pip install poetry && poetry config virtualenvs.in-project true

WORKDIR ${WORKDIR}
COPY . .

COPY pyproject.toml poetry.lock ${WORKDIR}/

RUN poetry export --only=main --without-hashes --no-interaction --no-ansi -f requirements.txt -o requirements.txt

FROM public.ecr.aws/lambda/python:3.9

# https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-create-from-base

ARG WORKDIR

COPY --from=requirement_generator ${WORKDIR}/requirements.txt .

# syntax = docker/dockerfile:experimental
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

COPY music_generator/ ${LAMBDA_TASK_ROOT}/music_generator/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}

ENV PYTHONPATH=${LAMBDA_TASK_ROOT}/src:${PYTHONPATH}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda_handler.handler" ]
