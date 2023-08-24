FROM public.ecr.aws/lambda/python:3.9

# https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-create-from-base

# Install the function's dependencies using file requirements.txt
# from your project folder.


COPY requirements.txt  .
RUN  pip3 install --no-cache-dir -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

COPY src/ ${LAMBDA_TASK_ROOT}/src/

ENV PYTHONPATH=${LAMBDA_TASK_ROOT}/src:${PYTHONPATH}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda_handler.handler" ]
