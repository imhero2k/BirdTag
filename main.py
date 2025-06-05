import os
import json
import boto3
import uuid
from io import BytesIO
from tempfile import NamedTemporaryFile
from PIL import Image
from datetime import datetime
from birds_detection import image_prediction, video_prediction

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('BirdMediaMetadata')

def handler(event, context):
    results = []

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        suffix = os.path.splitext(key)[-1].lower()
        with NamedTemporaryFile(delete=False, suffix=suffix, dir='/tmp') as tmp:
            s3.download_fileobj(bucket, key, tmp)
            tmp_path = tmp.name

        file_id = str(uuid.uuid4())
        file_type = 'unsupported'
        species_count = {"error": "Unsupported file type"}
        thumbnail_s3_path = None

        # Prediction logic
        if suffix in ['.jpg', '.jpeg', '.png']:
            species_count = image_prediction(tmp_path)
            file_type = 'image'
        elif suffix in ['.mp4', '.mov', '.avi']:
            species_count = video_prediction(tmp_path)
            file_type = 'video'

        # Generate thumbnail if image
        if file_type == 'image':
            try:
                with Image.open(tmp_path) as img:
                    img.thumbnail((128, 128))
                    buffer = BytesIO()
                    fmt = 'PNG' if suffix == '.png' else 'JPEG'
                    img.save(buffer, fmt)
                    buffer.seek(0)

                    orig_filename = key.split('/')[-1]
                    thumb_key = f"thumbnails/{file_id}_{orig_filename}"
                    thumb_bucket = os.environ.get('THUMBNAIL_BUCKET', 'thumbnailbucket134')

                    s3.put_object(
                        Bucket=thumb_bucket,
                        Key=thumb_key,
                        Body=buffer,
                        ContentType=f"image/{fmt.lower()}"
                    )

                    thumbnail_s3_path = f"s3://{thumb_bucket}/{thumb_key}"
            except Exception as e:
                print(f"Thumbnail generation failed: {e}")

        # Clean up local temp file
        os.remove(tmp_path)

        # Store prediction result
        result_bucket = os.environ.get('RESULT_BUCKET', bucket)
        result_key = f"results/{os.path.basename(key)}.json"
        s3.put_object(
            Bucket=result_bucket,
            Key=result_key,
            Body=json.dumps(species_count)
        )

        # Record metadata if supported type
        if file_type != 'unsupported':
            item = {
                'file_id': file_id,
                'original_s3_path': f"s3://{bucket}/{key}",
                'result_s3_path': f"s3://{result_bucket}/{result_key}",
                'upload_time': datetime.utcnow().isoformat(),
                'file_type': file_type,
                'tags': species_count
            }

            if thumbnail_s3_path:
                item['thumbnail_s3_path'] = thumbnail_s3_path

            table.put_item(Item=item)

        results.append({
            "input": {"bucket": bucket, "key": key},
            "output": {"bucket": result_bucket, "key": result_key},
            "result": species_count,
            "thumbnail": thumbnail_s3_path
        })

    return {
        "statusCode": 200,
        "body": json.dumps(results)
    }
