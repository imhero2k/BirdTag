# Use the official AWS Lambda Python 3.9 base image
# Ensure this matches your Lambda function's runtime configuration in AWS
FROM public.ecr.aws/lambda/python:3.9

# Set the working directory in the container
WORKDIR /var/task

# --- CRITICAL ADDITION: Install FFmpeg and other necessary system dependencies ---
# 'amazon-linux-extras' provides access to repositories like EPEL, where FFmpeg is available.
# This ensures pydub and librosa can handle various audio formats robustly.
RUN amazon-linux-extras enable epel | tee /dev/null && \
    yum install -y ffmpeg libsndfile-devel && \
    yum clean all && rm -rf /var/cache/yum

# Copy your application code into the container
# Make sure 'audio_processing_lambda.py' is in the same directory as your Dockerfile
COPY audio_processing_lambda.py .

# Copy your requirements.txt file
COPY requirements.txt .

# Install Python dependencies from requirements.txt
# Using --no-cache-dir is a good practice to avoid stale pip caches during builds.
RUN pip install --no-cache-dir -r requirements.txt
# --- DIAGNOSTIC STEP (Optional, but highly recommended for debugging) ---
# This will verify if tflite_runtime can be imported *during the Docker build*.
# If this step fails, the problem is within the image itself.
# This specifies the entry point for your Lambda function when it starts.
CMD [ "audio_processing_lambda.lambda_handler" ]