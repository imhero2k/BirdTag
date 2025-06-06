import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle GET/POST /search/by-tags - Find files by bird species with counts
    NEW: Generates fresh pre-signed URLs from stored S3 keys
    GET format: ?tag1=crow&count1=3&tag2=pigeon&count2=2
    POST format: {"crow": 3, "pigeon": 2}
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
                    'example': '{"crow": 3}, {"pigeon": 2, "crow": 1}'
                }, headers
            )
        
        #  NEW: Search database and generate fresh pre-signed URLs
        matching_files = search_by_tags_with_presigned_urls(tag_requirements)
        
        # Format response according to assessment requirements
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
    
    print(f"GET - Raw query parameters: {query_params}")
    
    # Extract tag-count pairs
    tag_numbers = set()
    for key in query_params.keys():
        if key.startswith('tag'):
            tag_num = key[3:]
            if tag_num.isdigit():
                tag_numbers.add(tag_num)
    
    # Build tag requirements dictionary
    for tag_num in tag_numbers:
        tag_key = f'tag{tag_num}'
        count_key = f'count{tag_num}'
        
        if tag_key in query_params:
            tag_name = query_params[tag_key].lower().strip()
            count_value = query_params.get(count_key, '1')
            
            try:
                count = int(count_value)
                if count > 0:
                    tag_requirements[tag_name] = count
            except ValueError:
                print(f"Invalid count value for {tag_key}: {count_value}")
    
    print(f"GET - Parsed tag requirements: {tag_requirements}")
    return tag_requirements

def parse_post_parameters(event):
    """Parse POST JSON body: {"crow": 3, "pigeon": 2}"""
    try:
        body = json.loads(event['body'] or '{}')
        print(f"POST - Raw body: {body}")
    except (json.JSONDecodeError, TypeError) as e:
        print(f"POST - JSON decode error: {e}")
        raise ValueError("Invalid JSON in request body")
    
    tag_requirements = {}
    
    # Handle different POST formats
    if 'tags' in body:
        # Complex structure: {"tags": {"crow": 3}, "operation": "AND"}
        tags_dict = body['tags']
        for tag_name, count in tags_dict.items():
            if isinstance(count, (int, str)) and str(count).isdigit():
                tag_requirements[tag_name.lower()] = int(count)
    else:
        # Simple structure: {"crow": 3, "pigeon": 2}
        for key, value in body.items():
            if isinstance(value, (int, str)) and str(value).isdigit():
                tag_requirements[key.lower()] = int(value)
    
    print(f"POST - Parsed tag requirements: {tag_requirements}")
    return tag_requirements

def search_by_tags_with_presigned_urls(tag_requirements):
    """
    CORE NEW FUNCTION: Search by tags and generate fresh pre-signed URLs
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        s3_client = boto3.client('s3')  # NEW: For generating URLs
        
        print(f"Searching for: {tag_requirements}")
        
        # Scan table and filter results
        response = table.scan()
        items = response['Items']
        
        # Continue scanning if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        
        print(f"Found {len(items)} total items in database")
        
        matching_files = []
        
        for item in items:
            file_tags = item.get('tags', {})
            simple_tags = convert_dynamodb_tags(file_tags)
            
            meets_requirements = True
            
            # Check if file meets all tag count requirements (AND operation)
            for required_tag, required_count in tag_requirements.items():
                file_tag_count = simple_tags.get(required_tag.lower(), 0)
                if file_tag_count < required_count:
                    meets_requirements = False
                    break
            
            #  NEW: Generate fresh pre-signed URL if requirements met
            if meets_requirements:
                presigned_url = generate_appropriate_presigned_url(item, s3_client)
                
                if presigned_url and presigned_url not in matching_files:
                    matching_files.append(presigned_url)
                    print(f" Added fresh URL: {presigned_url[:50]}...")
        
        print(f"Final matching files: {len(matching_files)} URLs generated")
        return matching_files
        
    except ClientError as e:
        print(f"AWS error in tag search: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error in tag search: {str(e)}")
        return []

def generate_appropriate_presigned_url(item, s3_client):
    """
     KEY FUNCTION: Generate appropriate pre-signed URL based on file type
    For images: return thumbnail URL
    For audio/video: return original URL
    """
    try:
        file_type = item.get('file_type', '')
        bucket_name = item.get('bucket_name', 'lambdatestbucket134')
        
        # Get S3 keys from database
        original_key = item.get('original_s3_key', '')
        thumbnail_key = item.get('thumbnail_s3_key', '')
        
        if file_type.startswith('image/') and thumbnail_key:
            # For images: prefer thumbnail if available
            s3_key = thumbnail_key
        elif original_key:
            # For audio/video or images without thumbnails: use original
            s3_key = original_key
        else:
            print(f"No valid S3 key found for file_id: {item.get('file_id')}")
            return None
        
        #  Generate fresh pre-signed URL (5 hours expiration)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key
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
        except (ValueError, KeyError) as e:
            print(f"Error converting tag {tag_name}: {tag_value}, error: {e}")
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