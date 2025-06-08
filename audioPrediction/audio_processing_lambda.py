#!/usr/bin/env python3
import os
import json
from datetime import datetime
import boto3
import logging
from botocore.exceptions import ClientError
from decimal import Decimal
import numpy as np
import librosa
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS resources
s3 = boto3.client('s3')

dynamodb = boto3.resource('dynamodb')

# Environment variables
DYNAMO_TABLE = os.environ.get('DYNAMO_TABLE', 'BirdMediaMetadata')
MODEL_BUCKET = os.environ.get('MODEL_BUCKET', 'modelbucket134')
MODEL_KEY = os.environ.get('MODEL_KEY', 'BirdNET_Model.tflite')
LABELS_KEY = os.environ.get('LABELS_KEY', 'labels.txt')
MIN_CONFIDENCE = float(os.environ.get('MIN_CONF', 0.25))
DEFAULT_LAT = float(os.environ.get('LAT', -33.8688))
DEFAULT_LON = float(os.environ.get('LON', 151.2093))
THUMBNAIL_BUCKET = os.environ.get('THUMBNAIL_BUCKET', '')
RESULT_BUCKET = os.environ.get('RESULT_BUCKET', '')


def download_file_from_s3(bucket_name: str, key: str, local_path: str):
    logger.info(f"Downloading s3://{bucket_name}/{key} to {local_path}")
    try:
        s3.download_file(bucket_name, key, local_path)
    except ClientError as e:
        logger.error(f"Failed to download {key} from {bucket_name}: {e}")
        raise


def get_model_path() -> str:
    path = f"/tmp/{os.path.basename(MODEL_KEY)}"
    download_file_from_s3(MODEL_BUCKET, MODEL_KEY, path)
    return path


def get_labels_file_path() -> str:
    path = f"/tmp/{os.path.basename(LABELS_KEY)}"
    download_file_from_s3(MODEL_BUCKET, LABELS_KEY, path)
    return path


def audio_prediction(audio_path, model_path, labels_path, min_confidence=0.25, num_threads=8):
    try:
        from tflite_runtime.interpreter import Interpreter
    except ImportError:
        import tensorflow as tf
        Interpreter = tf.lite.Interpreter
    interpreter = Interpreter(model_path=model_path, num_threads=num_threads)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]['index']
    out = interpreter.get_output_details()[0]['index']

    sig, _ = librosa.load(audio_path, sr=48000, mono=True, res_type='kaiser_fast')
    # split into 3s chunks
    chunk_len = 48000 * 3
    chunks = [sig[i:i+chunk_len] for i in range(0, len(sig), chunk_len) if len(sig[i:i+chunk_len]) >= chunk_len]

    labels = Path(labels_path).read_text().splitlines()
    detections = {}
    for c in chunks:
        data = np.expand_dims(np.pad(c, (0, max(0, chunk_len - len(c))), 'constant'), 0).astype('float32')
        interpreter.set_tensor(inp, data)
        interpreter.invoke()
        out_data = interpreter.get_tensor(out)[0]
        for idx, conf in enumerate(out_data):
            if conf >= min_confidence and idx < len(labels):
                species = labels[idx]
                detections[species] = max(detections.get(species, 0), float(conf))
    return detections


def lambda_handler(event, context):
    table = dynamodb.Table(DYNAMO_TABLE)
    results = []

    for rec in event['Records']:
        bucket = rec['s3']['bucket']['name']
        key = rec['s3']['object']['key']
        local = f"/tmp/{os.path.basename(key)}"
        download_file_from_s3(bucket, key, local)

        # Predict
        model_path = get_model_path()
        labels_path = get_labels_file_path()
        detected = audio_prediction(local, model_path, labels_path, MIN_CONFIDENCE)

        # Convert floats to Decimal for DynamoDB
        safe_tags = {species: Decimal(str(conf)) for species, conf in detected.items()}

        # Upload result JSON
        out_bucket = RESULT_BUCKET or bucket
        result_key = f"results/{os.path.basename(key)}.json"
        s3.put_object(Bucket=out_bucket, Key=result_key, Body=json.dumps(detected))

        # Build item with same schema as image/video
        item = {
            'file_id': key,
            'original_s3_path': f"s3://{bucket}/{key}",
            'result_s3_path': f"s3://{out_bucket}/{result_key}",
            'upload_time': Decimal(str(datetime.utcnow().timestamp())),
            'file_type': 'audio',
            'tags': safe_tags
        }

        # No thumbnail for audio
        table.put_item(Item=item)

        # Cleanup
        os.remove(local)

        results.append({
            'input': {'bucket': bucket, 'key': key},
            'output': {'bucket': out_bucket, 'key': result_key},
            'result': detected,
            'thumbnail': None
        })

    return {'statusCode': 200, 'body': json.dumps(results)}
