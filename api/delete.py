import json
import boto3
import re
from botocore.exceptions import ClientError
from datetime import datetime, timezone

def lambda_handler(event, context):
    """
    Delete files and thumbnails from S3 and remove database entries
    UPDATED: Works with existing database schema (original_s3_path, thumbnail_s3_path, result_s3_path)
    Handles multiple buckets: lambdatestbucket134 and thumbnailbucket134
    ENHANCED: Robust URL handling for both legacy and regional S3 URL formats
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    try:
        # Handle CORS preflight
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Parse request body
        try:
            body = json.loads(event['body'])
        except (json.JSONDecodeError, TypeError):
            return create_error_response(
                400, 'INVALID_JSON', 'Request body must be valid JSON',
                {'expected_format': '{"urls": ["url1", "url2", ...]}'}, headers
            )
        
        urls = body.get('urls', [])
        if not urls or not isinstance(urls, list):
            return create_error_response(
                400, 'INVALID_URLS', 'urls field must be a non-empty array',
                {'provided': urls}, headers
            )
        
        # Initialize AWS clients
        s3_client = boto3.client('s3')
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        
        deleted_files = []
        errors = []
        
        for url in urls:
            try:
                # Convert URL to S3 path format
                s3_path = convert_url_to_s3_path(url)
                
                if not s3_path:
                    errors.append({
                        'url': url,
                        'error': 'Could not convert URL to S3 path format',
                        'details': 'URL format not recognized'
                    })
                    continue
                
                print(f"Converted URL to S3 path: {s3_path}")
                
                # Search database for record with this S3 path
                database_record = find_record_by_s3_path(table, s3_path)
                
                if not database_record:
                    errors.append({
                        'url': url,
                        'error': 'File not found in database',
                        'searched_path': s3_path
                    })
                    continue
                
                file_id = database_record['file_id']
                print(f"Found database record for file_id: {file_id}")
                
                # Collect all S3 objects to delete from this record
                objects_to_delete = []
                
                # Add original file
                original_path = database_record.get('original_s3_path', '')
                if original_path:
                    bucket, key = extract_bucket_and_key(original_path)
                    if bucket and key:
                        objects_to_delete.append({
                            'bucket': bucket,
                            'key': key,
                            'type': 'original'
                        })
                
                # Add thumbnail file
                thumbnail_path = database_record.get('thumbnail_s3_path', '')
                if thumbnail_path and thumbnail_path.strip():
                    bucket, key = extract_bucket_and_key(thumbnail_path)
                    if bucket and key:
                        objects_to_delete.append({
                            'bucket': bucket,
                            'key': key,
                            'type': 'thumbnail'
                        })
                
                # Add result file
                result_path = database_record.get('result_s3_path', '')
                if result_path and result_path.strip():
                    bucket, key = extract_bucket_and_key(result_path)
                    if bucket and key:
                        objects_to_delete.append({
                            'bucket': bucket,
                            'key': key,
                            'type': 'result'
                        })
                
                # Delete objects from S3 (grouped by bucket)
                deleted_objects = []
                s3_errors = []
                
                # Group objects by bucket for batch deletion
                buckets_objects = {}
                for obj in objects_to_delete:
                    bucket = obj['bucket']
                    if bucket not in buckets_objects:
                        buckets_objects[bucket] = []
                    buckets_objects[bucket].append({
                        'Key': obj['key'],
                        'type': obj['type']
                    })
                
                # Delete from each bucket
                for bucket, bucket_objects in buckets_objects.items():
                    try:
                        delete_response = s3_client.delete_objects(
                            Bucket=bucket,
                            Delete={
                                'Objects': [{'Key': obj['Key']} for obj in bucket_objects],
                                'Quiet': False
                            }
                        )
                        
                        # Track successful deletions
                        for obj in bucket_objects:
                            deleted_objects.append({
                                'bucket': bucket,
                                'key': obj['Key'],
                                'type': obj['type']
                            })
                        
                        # Check for S3 deletion errors
                        if delete_response.get('Errors'):
                            s3_errors.extend(delete_response['Errors'])
                            
                    except ClientError as e:
                        s3_errors.append({
                            'bucket': bucket,
                            'error': str(e)
                        })
                
                if s3_errors:
                    errors.append({
                        'url': url,
                        'error': f"S3 deletion errors: {s3_errors}",
                        'file_id': file_id
                    })
                    continue
                
                # Delete from DynamoDB
                table.delete_item(Key={'file_id': file_id})
                
                # Prepare success response
                deleted_files.append({
                    'file_id': file_id,
                    'original_path': original_path if original_path else None,
                    'thumbnail_path': thumbnail_path if thumbnail_path.strip() else None,
                    'result_path': result_path if result_path.strip() else None,
                    'deleted_s3_objects': len(deleted_objects),
                    'deleted_objects_detail': deleted_objects
                })
                
                print(f"Successfully deleted file_id: {file_id}")
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                errors.append({
                    'url': url,
                    'error': f"AWS error ({error_code}): {str(e)}"
                })
            except Exception as e:
                errors.append({
                    'url': url,
                    'error': f"Unexpected error: {str(e)}"
                })
        
        # Prepare response
        response_data = {
            'deleted_count': len(deleted_files),
            'error_count': len(errors),
            'deleted_files': deleted_files,
            'errors': errors if errors else None,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        status_code = 200 if not errors else 207  # 207 = Multi-Status
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Unexpected error in delete handler: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_type': type(e).__name__, 'error_details': str(e)}, headers
        )

def convert_url_to_s3_path(url):
    """
    Convert various URL formats to S3 path format using robust regex
    Handles both legacy and regional S3 URL formats:
    - Legacy: https://bucket.s3.amazonaws.com/key
    - Regional: https://bucket.s3.region.amazonaws.com/key
    - Pre-signed URLs with query parameters
    - Both HTTP and HTTPS protocols
    """
    if not url:
        return None
    
    try:
        # If already S3 path format
        if url.startswith('s3://'):
            return url
        
        # Robust regex pattern for S3 URLs
        # Matches: https://bucket.s3[.region].amazonaws.com/key[?queryparams]
        pattern = r'https?://([^.]+)\.s3(?:\.[^.]+)?\.amazonaws\.com/(.+?)(?:\?.*)?$'
        match = re.match(pattern, url)
        
        if match:
            bucket = match.group(1)
            key = match.group(2)
            return f"s3://{bucket}/{key}"
        
        print(f"URL does not match S3 pattern: {url}")
        return None
        
    except Exception as e:
        print(f"Error converting URL to S3 path: {e}")
        return None

def find_record_by_s3_path(table, s3_path):
    """
    Search database for record containing the S3 path
    Checks original_s3_path, thumbnail_s3_path, and result_s3_path fields
    """
    try:
        print(f"Searching database for S3 path: {s3_path}")
        
        # Try searching by original_s3_path
        response = table.scan(
            FilterExpression='original_s3_path = :path',
            ExpressionAttributeValues={':path': s3_path}
        )
        
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='original_s3_path = :path',
                ExpressionAttributeValues={':path': s3_path},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        if items:
            print(f"Found record by original_s3_path")
            return items[0]
        
        # Try searching by thumbnail_s3_path
        response = table.scan(
            FilterExpression='thumbnail_s3_path = :path',
            ExpressionAttributeValues={':path': s3_path}
        )
        
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='thumbnail_s3_path = :path',
                ExpressionAttributeValues={':path': s3_path},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        if items:
            print(f"Found record by thumbnail_s3_path")
            return items[0]
        
        # Try searching by result_s3_path
        response = table.scan(
            FilterExpression='result_s3_path = :path',
            ExpressionAttributeValues={':path': s3_path}
        )
        
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='result_s3_path = :path',
                ExpressionAttributeValues={':path': s3_path},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        if items:
            print(f"Found record by result_s3_path")
            return items[0]
        
        print("No matching record found")
        return None
        
    except Exception as e:
        print(f"Error searching database: {str(e)}")
        return None

def extract_bucket_and_key(s3_path):
    """
    Extract bucket and key from S3 path
    Examples:
    - s3://lambdatestbucket134/file.jpg -> bucket=lambdatestbucket134, key=file.jpg
    - s3://thumbnailbucket134/thumbnails/file_thumb.jpg -> bucket=thumbnailbucket134, key=thumbnails/file_thumb.jpg
    - s3://lambdatestbucket134/results/file_result.jpg -> bucket=lambdatestbucket134, key=results/file_result.jpg
    """
    if not s3_path or not s3_path.startswith('s3://'):
        return None, None
    
    try:
        path_without_prefix = s3_path[5:]  # Remove 's3://'
        parts = path_without_prefix.split('/', 1)
        
        if len(parts) != 2:
            return None, None
        
        bucket = parts[0]
        key = parts[1]
        
        return bucket, key
        
    except Exception as e:
        print(f"Error extracting bucket/key from {s3_path}: {e}")
        return None, None

def create_error_response(status_code, error_code, message, details, headers):
    """Create standardized error response"""
    error_response = {
        'error': message,
        'code': error_code,
        'details': details,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': status_code
    }
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(error_response)
    }