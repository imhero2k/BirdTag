import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from urllib.parse import unquote_plus
import re

def lambda_handler(event, context):
    """
    Handle GET /search/by-thumbnail - Find full-size image from thumbnail URL
    NEW: Works with S3 keys and generates fresh pre-signed URLs
    Expected format: ?thumbnail_url=https://lambdatestbucket134.s3.amazonaws.com/20250605_104245_30bd546b-ebe_thumb.jpg
    Returns the corresponding original/full-size image URL as a fresh pre-signed URL
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
        
        # Only allow GET method
        if event['httpMethod'] != 'GET':
            return create_error_response(
                405, 'METHOD_NOT_ALLOWED', 'Only GET method is supported',
                {'supported_methods': ['GET']}, headers
            )
        
        # Parse and validate query parameters
        thumbnail_url = parse_thumbnail_parameter(event)
        
        if not thumbnail_url:
            return create_error_response(
                400, 'MISSING_PARAMETERS', 'thumbnail_url parameter is required',
                {
                    'expected_format': '?thumbnail_url=https://bucket.s3.amazonaws.com/file_thumb.jpg',
                    'example': '/search/by-thumbnail?thumbnail_url=https://lambdatestbucket134.s3.amazonaws.com/20250605_104245_30bd546b-ebe_thumb.jpg'
                }, headers
            )
        
        # Extract S3 key from thumbnail URL and search database
        full_image_url = search_by_thumbnail_and_generate_url(thumbnail_url)
        
        if not full_image_url:
            return create_error_response(
                404, 'THUMBNAIL_NOT_FOUND', 'No matching file found for the provided thumbnail URL',
                {'provided_thumbnail_url': thumbnail_url}, headers
            )
        
        # Format response according to assessment requirements
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
    """
    Parse thumbnail_url parameter from query string
    Handles URL encoding and various formats
    """
    query_params = event.get('queryStringParameters') or {}
    
    print(f"Raw query parameters: {query_params}")
    
    thumbnail_url = query_params.get('thumbnail_url', '').strip()
    
    if not thumbnail_url:
        return None
    
    # URL decode the parameter (handles %20, etc.)
    thumbnail_url = unquote_plus(thumbnail_url)
    
    print(f"Parsed thumbnail URL: {thumbnail_url}")
    return thumbnail_url

def search_by_thumbnail_and_generate_url(thumbnail_url):
    """
    NEW APPROACH: Extract S3 key from thumbnail URL, find database record, 
    generate fresh pre-signed URL for full-size image
    """
    try:
        # Extract S3 key from thumbnail URL
        thumbnail_key = extract_s3_key_from_url(thumbnail_url)
        
        if not thumbnail_key:
            print(f"Could not extract S3 key from URL: {thumbnail_url}")
            return None
        
        print(f"Extracted thumbnail key: {thumbnail_key}")
        
        # Search database for record with this thumbnail key
        database_record = find_record_by_thumbnail_key(thumbnail_key)
        
        if not database_record:
            print(f"No database record found for thumbnail key: {thumbnail_key}")
            return None
        
        # Generate fresh pre-signed URL for the original/full-size image
        full_size_url = generate_full_size_presigned_url(database_record)
        
        if full_size_url:
            print(f"Generated full-size URL: {full_size_url[:50]}...")
            return full_size_url
        else:
            print("Failed to generate full-size URL")
            return None
        
    except Exception as e:
        print(f"Error in thumbnail search: {str(e)}")
        return None

def extract_s3_key_from_url(url):
    """
    Extract S3 key from various URL formats:
    - https://bucket.s3.amazonaws.com/key -> key
    - Pre-signed URLs ->  extract key from path
    - S3 URI format -> extract key
    """
    if not url:
        return None
    
    try:
        # Handle HTTPS S3 URLs
        if 'amazonaws.com/' in url:
            # Split by amazonaws.com/ and take the path part
            parts = url.split('amazonaws.com/', 1)
            if len(parts) == 2:
                key_part = parts[1]
                
                # Remove query parameters from pre-signed URLs
                if '?' in key_part:
                    key_part = key_part.split('?')[0]
                
                return key_part
        
        # Handle S3 URI format: s3://bucket/key
        elif url.startswith('s3://'):
            parts = url.split('/', 3)
            if len(parts) >= 4:
                return parts[3]
        
        # If it's already just a key (no protocol)
        elif not url.startswith(('http', 's3://')):
            return url
        
        return None
        
    except Exception as e:
        print(f"Error extracting S3 key from URL: {e}")
        return None

def find_record_by_thumbnail_key(thumbnail_key):
    """
    Search database for record with matching thumbnail_s3_key
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        
        print(f"Searching database for thumbnail key: {thumbnail_key}")
        
        # Scan table to find matching thumbnail key
        response = table.scan(
            FilterExpression='thumbnail_s3_key = :thumb_key',
            ExpressionAttributeValues={':thumb_key': thumbnail_key}
        )
        
        items = response['Items']
        
        # Continue scanning if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='thumbnail_s3_key = :thumb_key',
                ExpressionAttributeValues={':thumb_key': thumbnail_key},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        if items:
            print(f"Found {len(items)} matching records")
            return items[0]  # Return first match
        
        print("No matching records found")
        return None
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error searching database: {str(e)}")
        return None

def generate_full_size_presigned_url(database_record):
    """
    Generate fresh pre-signed URL for the original/full-size image
    """
    try:
        s3_client = boto3.client('s3')
        
        # Get original image key and bucket from database record
        original_key = database_record.get('original_s3_key', '')
        bucket_name = database_record.get('bucket_name', 'lambdatestbucket134')
        
        if not original_key:
            print("No original_s3_key found in database record")
            return None
        
        print(f"Generating pre-signed URL for: bucket={bucket_name}, key={original_key}")
        
        # Generate fresh pre-signed URL (5 hours expiration)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': original_key
            },
            ExpiresIn=18000  # 5 hours
        )
        
        return presigned_url
        
    except ClientError as e:
        print(f"Error generating pre-signed URL: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error generating URL: {str(e)}")
        return None

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