import json
import boto3
import time
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle POST /search/by-file-tag
    Process temporary uploaded file, extract tags, search for matching files, then cleanup
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
        
        if event['httpMethod'] != 'POST':
            return create_error_response(
                405, 'METHOD_NOT_ALLOWED', 'Only POST method is supported',
                {'supported_methods': ['POST']}, headers
            )
        
        # Parse and validate request body
        try:
            body = json.loads(event['body'])
        except (json.JSONDecodeError, TypeError):
            return create_error_response(
                400, 'INVALID_JSON', 'Request body must be valid JSON',
                {'expected_format': '{"fileId": "abc123", "s3Key": "temp/abc123.mp4"}'}, headers
            )
        
        file_id = body.get('fileId')
        s3_key = body.get('s3Key')
        
        if not file_id:
            return create_error_response(
                400, 'MISSING_FILE_ID', 'fileId is required',
                {'provided_fields': list(body.keys())}, headers
            )
        
        if not s3_key:
            return create_error_response(
                400, 'MISSING_S3_KEY', 's3Key is required',
                {'provided_fields': list(body.keys())}, headers
            )
        
        # Validate that this is a temp file
        if not s3_key.startswith('temp/'):
            return create_error_response(
                400, 'INVALID_TEMP_FILE', 's3Key must be in temp/ folder',
                {'provided_s3_key': s3_key, 'expected_prefix': 'temp/'}, headers
            )
        
        print(f"Processing temp file: {file_id}, S3 key: {s3_key}")
        
        # Initialize AWS clients
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        s3_client = boto3.client('s3')
        
        # Step 1: Poll database until temp file processing is complete
        detected_tags = None
        temp_file_record = None
        
        print("Polling database for temp file processing completion...")
        for attempt in range(15):  # Poll for up to 30 seconds
            try:
                # Search for temp file in database
                response = table.scan(
                    FilterExpression='file_id = :file_id',
                    ExpressionAttributeValues={':file_id': file_id}
                )
                
                if response['Items']:
                    temp_file_record = response['Items'][0]
                    detected_tags = temp_file_record.get('tags', {})
                    print(f"Found temp file record with tags: {detected_tags}")
                    break
                    
            except Exception as e:
                print(f"Error polling database (attempt {attempt + 1}): {str(e)}")
            
            if attempt < 14:  # Don't sleep on last attempt
                time.sleep(2)
        
        if not detected_tags:
            return create_error_response(
                408, 'PROCESSING_TIMEOUT', 'File processing timed out or failed',
                {
                    'file_id': file_id,
                    'timeout_seconds': 30,
                    'suggestion': 'Try again in a few moments'
                }, headers
            )
        
        # Step 2: Search for files with matching tags (OR logic, excluding temp files)
        matching_files = search_files_by_detected_tags(detected_tags, s3_client)
        
        # Step 3: Cleanup - Delete temp file from S3
        try:
            s3_client.delete_object(
                Bucket='lambdatestbucket134',
                Key=s3_key
            )
            print(f"Deleted temp S3 file: {s3_key}")
        except ClientError as e:
            print(f"Error deleting S3 temp file: {str(e)}")
            # Continue anyway. this is cleanup, not critical
        
        # Step 4: Cleanup. Delete temp file from database
        try:
            table.delete_item(Key={'file_id': file_id})
            print(f"Deleted temp database record: {file_id}")
        except ClientError as e:
            print(f"Error deleting database temp record: {str(e)}")
            # Continue anyway. this is cleanup, not critical
        
        # Step 5: Return results
        response_data = {
            "detected_tags": convert_dynamodb_tags(detected_tags),
            "links": matching_files,
            "match_count": len(matching_files),
            "url_info": {
                "expires_in_hours": 5,
                "note": "All URLs are fresh pre-signed URLs that expire in 5 hours"
            },
            "cleanup_status": "temp files removed"
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Unexpected error in search by file tag: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def search_files_by_detected_tags(detected_tags, s3_client):
    """
    Search for files containing any of the detected tags (OR logic)
    Excludes temporary files
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        
        # Convert detected tags to simple format
        simple_detected_tags = convert_dynamodb_tags(detected_tags)
        detected_species = list(simple_detected_tags.keys())
        
        print(f"Searching for files containing any of: {detected_species}")
        
        # Scan table for all files
        response = table.scan()
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        
        matching_files = []
        
        for item in items:
            # Skip temp files
            original_path = item.get('original_s3_path', '')
            if 'temp/' in original_path:
                continue
            
            file_tags = item.get('tags', {})
            simple_tags = convert_dynamodb_tags(file_tags)
            
            # Check if file contains any of the detected species (OR logic)
            contains_detected_species = False
            for species in detected_species:
                species_count = simple_tags.get(species.lower(), 0)
                if species_count >= 1:
                    contains_detected_species = True
                    break
            
            if contains_detected_species:
                presigned_url = generate_presigned_url_from_paths(item, s3_client)
                
                if presigned_url and presigned_url not in matching_files:
                    matching_files.append(presigned_url)
        
        print(f"Found {len(matching_files)} matching files")
        return matching_files
        
    except Exception as e:
        print(f"Error searching files by detected tags: {str(e)}")
        return []

def generate_presigned_url_from_paths(item, s3_client):
    """Generate pre-signed URL by extracting S3 key from stored paths"""
    try:
        file_type = item.get('file_type', '')
        
        # Get S3 paths from database
        original_path = item.get('original_s3_path', '')
        thumbnail_path = item.get('thumbnail_s3_path', '')
        
        if file_type.startswith('image/') and thumbnail_path:
            s3_path = thumbnail_path
        elif original_path:
            s3_path = original_path
        else:
            return None
        
        # Extract bucket and key from S3 path
        bucket, key = extract_bucket_and_key(s3_path)
        
        if not bucket or not key:
            return None
        
        # Generate fresh pre-signed URL
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket,
                'Key': key
            },
            ExpiresIn=18000  # 5 hours
        )
        
        return presigned_url
        
    except Exception as e:
        print(f"Error generating pre-signed URL: {str(e)}")
        return None

def extract_bucket_and_key(s3_path):
    """Extract bucket and key from S3 path: s3://bucket/key"""
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

def convert_dynamodb_tags(file_tags):
    """Convert DynamoDB format to simple format"""
    simple_tags = {}
    
    for tag_name, tag_value in file_tags.items():
        try:
            if isinstance(tag_value, Decimal):
                simple_tags[tag_name.lower()] = int(tag_value)
            elif isinstance(tag_value, dict):
                if 'N' in tag_value:
                    simple_tags[tag_name.lower()] = int(tag_value['N'])
                elif 'S' in tag_value:
                    value = tag_value['S']
                    simple_tags[tag_name.lower()] = int(value) if value.isdigit() else 0
            elif isinstance(tag_value, (int, str)):
                if isinstance(tag_value, str) and tag_value.isdigit():
                    simple_tags[tag_name.lower()] = int(tag_value)
                elif isinstance(tag_value, int):
                    simple_tags[tag_name.lower()] = tag_value
        except (ValueError, KeyError):
            simple_tags[tag_name.lower()] = 0
    
    return simple_tags

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