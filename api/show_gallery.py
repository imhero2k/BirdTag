import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle GET /search/gallery
    Returns all media files with pre-signed URLs
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
        
        # Parse optional pagination parameters
        pagination_params = parse_pagination_parameters(event)
        
        # Get all media files with pre-signed URLs
        media_files = get_all_media_files_with_urls(pagination_params)
        
        # Group files by type for better organization
        grouped_files = group_files_by_type(media_files)
        
        response_data = {
            "gallery": grouped_files,
            "total_count": len(media_files),
            "url_info": {
                "expires_in_hours": 5,
                "note": "All URLs are fresh pre-signed URLs that expire in 5 hours"
            }
        }
        
        # Add pagination info if limits were applied
        if pagination_params.get('limit'):
            response_data["pagination"] = {
                "limit": pagination_params['limit'],
                "offset": pagination_params.get('offset', 0),
                "has_more": len(media_files) == pagination_params['limit']
            }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Unexpected error in gallery search: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def parse_pagination_parameters(event):
    """Parse optional pagination parameters"""
    query_params = event.get('queryStringParameters') or {}
    
    pagination = {}
    
    # Parse limit parameter (max 100)
    if 'limit' in query_params:
        try:
            limit = int(query_params['limit'])
            if limit > 0:
                pagination['limit'] = min(limit, 100)  # Cap at 100
        except (ValueError, TypeError):
            pass
    
    # Parse offset parameter  
    if 'offset' in query_params:
        try:
            offset = int(query_params['offset'])
            if offset >= 0:
                pagination['offset'] = offset
        except (ValueError, TypeError):
            pass
    
    return pagination

def get_all_media_files_with_urls(pagination_params):
    """
    Get all media files from database and generate pre-signed URLs
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        s3_client = boto3.client('s3')
        
        # Scan table to get all items
        response = table.scan()
        items = response['Items']
        
        # Continue scanning if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        
        print(f"Found {len(items)} total items in database")
        
        # Filter out temp files and build media list
        media_files = []
        
        for item in items:
            # Skip temp files (same logic as search_by_file_tag.py)
            original_path = item.get('original_s3_path', '')
            if 'temp/' in original_path:
                continue
            
            # Generate pre-signed URL
            presigned_url = generate_presigned_url_from_paths(item, s3_client)
            
            if presigned_url:
                # Build media file info
                media_info = {
                    'url': presigned_url,
                    'file_type': item.get('file_type', 'unknown'),
                    'file_id': item.get('file_id', ''),
                    'upload_date': item.get('upload_date', ''),
                    'tags': convert_dynamodb_tags(item.get('tags', {}))
                }
                
                media_files.append(media_info)
        
        print(f"Processed {len(media_files)} valid media files")
        
        # Sort by upload date (newest first) if available
        media_files.sort(key=lambda x: x.get('upload_date', ''), reverse=True)
        
        # Apply pagination if specified
        if pagination_params.get('limit'):
            offset = pagination_params.get('offset', 0)
            limit = pagination_params['limit']
            media_files = media_files[offset:offset + limit]
        
        return media_files
        
    except Exception as e:
        print(f"Error getting media files: {str(e)}")
        return []

def group_files_by_type(media_files):
    """Group files by type for better organization"""
    grouped = {
        'images': [],
        'audio': [],
        'video': [],
        'other': []
    }
    
    for media in media_files:
        file_type = media.get('file_type', '').lower()
        
        if file_type.startswith('image/'):
            grouped['images'].append(media)
        elif file_type.startswith('audio/'):
            grouped['audio'].append(media)
        elif file_type.startswith('video/'):
            grouped['video'].append(media)
        else:
            grouped['other'].append(media)
    
    return grouped

def generate_presigned_url_from_paths(item, s3_client):
    """
    Generate pre-signed URL by extracting S3 key from stored paths
    """
    try:
        file_type = item.get('file_type', '')
        
        # Get S3 paths from database
        original_path = item.get('original_s3_path', '')
        thumbnail_path = item.get('thumbnail_s3_path', '')
        
        if file_type.startswith('image/') and thumbnail_path:
            # For images: use thumbnail
            s3_path = thumbnail_path
        elif original_path:
            # For audio/video: use original
            s3_path = original_path
        else:
            return None
        
        # Extract bucket and key from S3 path
        bucket, key = extract_bucket_and_key(s3_path)
        
        if not bucket or not key:
            print(f"Could not extract bucket/key from path: {s3_path}")
            return None
        
        # Generate fresh pre-signed URL (5 hours expiration)
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
    """
    Extract bucket and key from S3 paths
    """
    if not s3_path or not s3_path.startswith('s3://'):
        return None, None
    
    try:
        # Remove s3:// prefix and split
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
    """
    Convert DynamoDB format to simple format
    """
    simple_tags = {}
    
    for tag_name, tag_value in file_tags.items():
        try:
            if isinstance(tag_value, Decimal):
                simple_tags[tag_name.lower()] = int(tag_value)
            elif isinstance(tag_value, dict):
                if 'N' in tag_value:
                    simple_tags[tag_name.lower()] = int(float(tag_value['N']))
                elif 'S' in tag_value:
                    value = tag_value['S']
                    simple_tags[tag_name.lower()] = int(float(value)) if value.replace('.', '').isdigit() else 0
            elif isinstance(tag_value, (int, str)):
                if isinstance(tag_value, str) and tag_value.replace('.', '').isdigit():
                    simple_tags[tag_name.lower()] = int(float(tag_value))
                elif isinstance(tag_value, int):
                    simple_tags[tag_name.lower()] = tag_value
        except (ValueError, KeyError):
            simple_tags[tag_name.lower()] = 0
    
    return simple_tags

def create_error_response(status_code, error_code, message, details, headers):
    """
    Create standardized error response
    """
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