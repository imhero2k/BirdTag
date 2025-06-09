import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from urllib.parse import unquote_plus

def lambda_handler(event, context):
    """
    Handle GET /search/by-thumbnail
    UPDATED: Works with existing database schema (thumbnail_s3_path) and handles UUID prefixes
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
    
    try:
        # Handle CORS preflight
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        if event['httpMethod'] != 'GET':
            return create_error_response(
                405, 'METHOD_NOT_ALLOWED', 'Only GET method is supported',
                {'supported_methods': ['GET']}, headers
            )
        
        # Parse thumbnail URL parameter
        thumbnail_url = parse_thumbnail_parameter(event)
        
        if not thumbnail_url:
            return create_error_response(
                400, 'MISSING_PARAMETERS', 'thumbnail_url parameter is required',
                {
                    'expected_format': '?thumbnail_url=https://bucket.s3.amazonaws.com/file_thumb.jpg',
                    'example': '/search/by-thumbnail?thumbnail_url=https://thumbnailbucket134.s3.amazonaws.com/thumbnails/file_thumb.jpg'
                }, headers
            )
        
        # Search database and generate full-size URL
        full_image_url = search_by_thumbnail_and_generate_url(thumbnail_url)
        
        if not full_image_url:
            return create_error_response(
                404, 'THUMBNAIL_NOT_FOUND', 'No matching file found for the provided thumbnail URL',
                {'provided_thumbnail_url': thumbnail_url}, headers
            )
        
        response_data = {
            "links": [full_image_url],
            "url_info": {
                "expires_in_hours": 5,
                "note": "Full-size image URL is a fresh pre-signed URL that expires in 5 hours"
            }
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Unexpected error in thumbnail search: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def parse_thumbnail_parameter(event):
    """Parse thumbnail_url parameter from query string"""
    query_params = event.get('queryStringParameters') or {}
    thumbnail_url = query_params.get('thumbnail_url', '').strip()
    
    if not thumbnail_url:
        return None
    
    # URL decode the parameter
    thumbnail_url = unquote_plus(thumbnail_url)
    return thumbnail_url

def search_by_thumbnail_and_generate_url(thumbnail_url):
    """
    Find record by thumbnail URL and generate full-size image URL
    UPDATED: Works with existing database schema and handles UUID prefixes
    """
    try:
        # Extract S3 path from thumbnail URL
        thumbnail_s3_path = convert_url_to_s3_path(thumbnail_url)
        
        if not thumbnail_s3_path:
            print(f"Could not convert URL to S3 path: {thumbnail_url}")
            return None
        
        print(f"Searching for thumbnail S3 path: {thumbnail_s3_path}")
        
        # Search database for record with this thumbnail path
        database_record = find_record_by_thumbnail_path(thumbnail_s3_path)
        
        if not database_record:
            print(f"No database record found for thumbnail path: {thumbnail_s3_path}")
            return None
        
        # Generate fresh pre-signed URL for the original image
        full_size_url = generate_original_presigned_url(database_record)
        
        return full_size_url
        
    except Exception as e:
        print(f"Error in thumbnail search: {str(e)}")
        return None

def convert_url_to_s3_path(url):
    """
    Convert various URL formats to S3 path format
    Input: https://thumbnailbucket134.s3.amazonaws.com/thumbnails/crows_4.jpg
    Output: s3://thumbnailbucket134/thumbnails/crows_4.jpg
    """
    if not url:
        return None
    
    try:
        # If already S3 path format
        if url.startswith('s3://'):
            return url
        
        # Handle HTTPS S3 URLs
        if 'amazonaws.com/' in url:
            # Remove protocol and query parameters
            url_clean = url.replace('https://', '').replace('http://', '').split('?')[0]
            
            # Handle standard S3 URL format: bucket.s3.amazonaws.com/key
            if '.s3.amazonaws.com/' in url_clean:
                parts = url_clean.split('.s3.amazonaws.com/')
                if len(parts) == 2:
                    bucket = parts[0]
                    key = parts[1]
                    return f"s3://{bucket}/{key}"
            
            # Handle regional S3 URLs: bucket.s3.region.amazonaws.com/key  
            elif '.s3.' in url_clean and '.amazonaws.com/' in url_clean:
                bucket_part = url_clean.split('.s3.')[0]
                key_start = url_clean.find('.amazonaws.com/') + len('.amazonaws.com/')
                key_part = url_clean[key_start:]
                return f"s3://{bucket_part}/{key_part}"
        
        return None
        
    except Exception as e:
        print(f"Error converting URL to S3 path: {e}")
        return None

def find_record_by_thumbnail_path(thumbnail_s3_path):
    """
    Search database for record with matching thumbnail_s3_path
    UPDATED: Handles UUID prefixes in stored paths
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        
        # First try exact match
        response = table.scan(
            FilterExpression='thumbnail_s3_path = :thumb_path',
            ExpressionAttributeValues={':thumb_path': thumbnail_s3_path}
        )
        
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='thumbnail_s3_path = :thumb_path',
                ExpressionAttributeValues={':thumb_path': thumbnail_s3_path},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        if items:
            print(f"Found {len(items)} matching records with exact path")
            return items[0]
        
        # If no exact match, try searching by filename (handling UUID prefix)
        # Extract just the filename from the input path
        if '/' in thumbnail_s3_path:
            filename = thumbnail_s3_path.split('/')[-1]
            print(f"No exact match found, searching for filename: {filename}")
            
            # Search for records where thumbnail_s3_path ends with the filename
            response = table.scan(
                FilterExpression='contains(thumbnail_s3_path, :filename)',
                ExpressionAttributeValues={':filename': filename}
            )
            
            items = response['Items']
            
            while 'LastEvaluatedKey' in response:
                response = table.scan(
                    FilterExpression='contains(thumbnail_s3_path, :filename)',
                    ExpressionAttributeValues={':filename': filename},
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response['Items'])
            
            # Filter to ensure the filename actually ends with our target filename
            # This prevents partial matches
            matching_items = []
            for item in items:
                stored_path = item.get('thumbnail_s3_path', '')
                if stored_path.endswith(filename):
                    matching_items.append(item)
            
            if matching_items:
                print(f"Found {len(matching_items)} matching records with filename match")
                return matching_items[0]
        
        print("No matching records found")
        return None
        
    except Exception as e:
        print(f"Error searching database: {str(e)}")
        return None

def generate_original_presigned_url(database_record):
    """Generate fresh pre-signed URL for the original image"""
    try:
        s3_client = boto3.client('s3')
        
        # Get original S3 path from database
        original_s3_path = database_record.get('original_s3_path', '')
        
        if not original_s3_path:
            print("No original_s3_path found in database record")
            return None
        
        # Extract bucket and key from S3 path
        bucket, key = extract_bucket_and_key(original_s3_path)
        
        if not bucket or not key:
            print(f"Could not extract bucket/key from: {original_s3_path}")
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
    """Extract bucket and key from S3 path"""
    if not s3_path or not s3_path.startswith('s3://'):
        return None, None
    
    try:
        path_without_prefix = s3_path[5:]  # Remove 's3://'
        parts = path_without_prefix.split('/', 1)
        
        if len(parts) != 2:
            return None, None
        
        return parts[0], parts[1]  # bucket, key
        
    except Exception as e:
        print(f"Error extracting bucket/key: {e}")
        return None, None

def create_error_response(status_code, error_code, message, details, headers):
    """Create standardized error response"""
    error_response = {
        'error': message,
        'code': error_code,
        'details': details,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(error_response)
    }