FROM public.ecr.aws/lambda/python:3.12

# Install system dependencies
RUN dnf install -y mesa-libGL glib2 libSM libXext libXrender

# Set working directory to Lambda's expected location
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy ALL required files to Lambda root (order matters)
COPY requirements.txt ./
RUN pip install --target "${LAMBDA_TASK_ROOT}" -r requirements.txt

# Copy application files after dependencies
COPY main.py birds_detection.py model.pt ./

CMD ["main.handler"]
