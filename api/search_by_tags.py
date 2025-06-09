import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle GET/POST /search/by-tags
    UPDATED: Extracts S3 keys from existing database paths and generates pre-signed URLs
    UPDATED: Supports substring matching for audio files
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    try:
        # Handle CORS preflight
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Handle both GET and POST methods
        if event['httpMethod'] == 'GET':
            tag_requirements = parse_get_parameters(event)
        elif event['httpMethod'] == 'POST':
            tag_requirements = parse_post_parameters(event)
        else:
            return create_error_response(
                405, 'METHOD_NOT_ALLOWED', 'Only GET and POST methods are supported',
                {'supported_methods': ['GET', 'POST']}, headers
            )
        
        if not tag_requirements:
            return create_error_response(
                400, 'MISSING_PARAMETERS', 'No valid tag parameters provided',
                {
                    'get_format': '?tag1=crow&count1=3&tag2=pigeon&count2=2',
                    'post_format': '{"crow": 3, "pigeon": 2}',
                    'note': 'Counts must be positive integers (> 0). For audio files, substring matching is used on the common name (part after underscore).'
                }, headers
            )
        
        # Search database and generate fresh pre-signed URLs
        matching_files = search_by_tags_with_presigned_urls(tag_requirements)
        
        response_data = {
            "links": matching_files,
            "url_info": {
                "expires_in_hours": 5,
                "note": "All URLs are fresh pre-signed URLs that expire in 5 hours"
            }
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
    
    except ValueError as e:
        # Handle validation errors (zero/negative counts)
        return create_error_response(
            400, 'INVALID_PARAMETERS', str(e),
            {'note': 'All counts must be positive integers greater than 0'}, headers
        )
        
    except Exception as e:
        print(f"Unexpected error in tag search: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def parse_get_parameters(event):
    """Parse GET parameters: ?tag1=crow&count1=3&tag2=pigeon&count2=2"""
    query_params = event.get('queryStringParameters') or {}
    tag_requirements = {}
    
    # Extract tag-count pairs
    tag_numbers = set()
    for key in query_params.keys():
        if key.startswith('tag'):
            tag_num = key[3:]
            if tag_num.isdigit():
                tag_numbers.add(tag_num)
    
    for tag_num in tag_numbers:
        tag_key = f'tag{tag_num}'
        count_key = f'count{tag_num}'
        
        if tag_key in query_params:
            tag_name = query_params[tag_key].lower().strip()
            count_value = query_params.get(count_key, '1')
            
            try:
                count = int(count_value)
                
                # Validate count is positive
                if count <= 0:
                    raise ValueError(f"Count for tag '{tag_name}' must be a positive integer greater than 0. Received: {count}")
                
                tag_requirements[tag_name] = count
                
            except ValueError as e:
                if "must be a positive integer" in str(e):
                    raise e  # Re-raise our custom validation error
                else:
                    raise ValueError(f"Invalid count value '{count_value}' for tag '{tag_name}'. Must be a positive integer.")
    
    return tag_requirements

def parse_post_parameters(event):
    """Parse POST JSON body: {"crow": 3, "pigeon": 2}"""
    try:
        body = json.loads(event['body'] or '{}')
    except (json.JSONDecodeError, TypeError):
        raise ValueError("Invalid JSON in request body")
    
    tag_requirements = {}
    
    if 'tags' in body:
        tags_dict = body['tags']
        for tag_name, count in tags_dict.items():
            validate_and_add_tag(tag_requirements, tag_name, count)
    else:
        for key, value in body.items():
            validate_and_add_tag(tag_requirements, key, value)
    
    return tag_requirements

def validate_and_add_tag(tag_requirements, tag_name, count_value):
    """Helper function to validate and add tag with count validation"""
    try:
        # Convert to integer
        if isinstance(count_value, str):
            if not count_value.replace('.', '').isdigit():
                raise ValueError(f"Invalid count value '{count_value}' for tag '{tag_name}'. Must be a positive integer.")
            count = int(float(count_value))
        elif isinstance(count_value, (int, float)):
            count = int(count_value)
        else:
            raise ValueError(f"Invalid count type for tag '{tag_name}'. Must be a positive integer.")
        
        # Validate count is positive
        if count <= 0:
            raise ValueError(f"Count for tag '{tag_name}' must be a positive integer greater than 0. Received: {count}")
        
        tag_requirements[tag_name.lower()] = count
        
    except ValueError as e:
        raise e  # Re-raise validation errors

def search_by_tags_with_presigned_urls(tag_requirements):
    """
    Search by tags and generate fresh pre-signed URLs from existing S3 paths
    UPDATED: Supports substring matching for audio files
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        s3_client = boto3.client('s3')
        
        # Scan table
        response = table.scan()
        items = response['Items']
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        
        matching_files = []
        
        for item in items:
            file_tags = item.get('tags', {})
            file_type = item.get('file_type', '')
            simple_tags = convert_dynamodb_tags(file_tags)
            
            meets_requirements = True
            
            # Check if file meets all tag count requirements (AND operation)
            for required_tag, required_count in tag_requirements.items():
                if not check_tag_requirement(simple_tags, required_tag, required_count, file_type):
                    meets_requirements = False
                    break
            
            if meets_requirements:
                presigned_url = generate_presigned_url_from_paths(item, s3_client)
                
                if presigned_url and presigned_url not in matching_files:
                    matching_files.append(presigned_url)
        
        return matching_files
        
    except Exception as e:
        print(f"Error in tag search: {str(e)}")
        return []

def check_tag_requirement(simple_tags, required_tag, required_count, file_type):
    """
    Check if a tag requirement is met, with different logic for audio vs other files
    - For audio files: use substring matching on the part after underscore
    - For other files: use exact matching
    """
    required_tag_lower = required_tag.lower()
    
    if file_type.startswith('audio'):
        # For audio files: substring matching on part after underscore - sum counts of all matching tags
        total_count = 0
        for tag_name, tag_count in simple_tags.items():
            # Extract the part after underscore (common name)
            if '_' in tag_name:
                common_name = tag_name.split('_', 1)[1].lower()
            else:
                common_name = tag_name.lower()
            
            if required_tag_lower in common_name:
                total_count += tag_count
                print(f"Audio substring match: '{required_tag}' found in common name '{common_name}' from tag '{tag_name}' with count {tag_count}")
        
        return total_count >= required_count
    else:
        # For non-audio files: exact matching
        file_tag_count = simple_tags.get(required_tag_lower, 0)
        return file_tag_count >= required_count

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
    Extract bucket and key from S3 paths based on your schema:
    - original_s3_path: s3://lambdatestbucket134/file.jpg -> bucket=lambdatestbucket134, key=file.jpg
    - thumbnail_s3_path: s3://thumbnailbucket134/thumbnails/file_thumb.jpg -> bucket=thumbnailbucket134, key=thumbnails/file_thumb.jpg  
    - result_s3_path: s3://lambdatestbucket134/results/file_result.jpg -> bucket=lambdatestbucket134, key=results/file_result.jpg
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
    """Convert DynamoDB format to simple format"""
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