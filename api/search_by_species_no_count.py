import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle GET /search/by-species
    UPDATED: Works with existing database schema (original_s3_path, thumbnail_s3_path, result_s3_path)
    UPDATED: Supports substring matching for audio files
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
        
        # Parse species parameters
        species_list = parse_species_parameters(event)
        
        if not species_list:
            return create_error_response(
                400, 'MISSING_PARAMETERS', 'No valid species parameters provided',
                {
                    'expected_format': '?species1=crow&species2=pigeon',
                    'single_format': '?species=crow',
                    'note': 'For audio files, substring matching is used (e.g., "Magpie" matches "Grallina cyanoleuca_Magpie-lark")'
                }, headers
            )
        
        # Search database and generate pre-signed URLs
        matching_files = search_by_species_with_presigned_urls(species_list)
        
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
        print(f"Unexpected error in species search: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def parse_species_parameters(event):
    """Parse GET parameters for species search"""
    query_params = event.get('queryStringParameters') or {}
    species_list = []
    
    # Handle single species parameter
    if 'species' in query_params:
        species_name = query_params['species'].lower().strip()
        if species_name:
            species_list.append(species_name)
    
    # Handle numbered species parameters
    species_numbers = set()
    for key in query_params.keys():
        if key.startswith('species') and key != 'species':
            species_num = key[7:]
            if species_num.isdigit():
                species_numbers.add(species_num)
    
    for species_num in species_numbers:
        species_key = f'species{species_num}'
        if species_key in query_params:
            species_name = query_params[species_key].lower().strip()
            if species_name and species_name not in species_list:
                species_list.append(species_name)
    
    return species_list

def search_by_species_with_presigned_urls(species_list):
    """
    Search for files containing any of the specified species
    UPDATED: Uses existing database schema with S3 paths and supports audio substring matching
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
            
            # Check if file contains any of the required species (OR logic)
            contains_species = False
            for species in species_list:
                if check_species_match(simple_tags, species, file_type):
                    contains_species = True
                    break
            
            if contains_species:
                presigned_url = generate_presigned_url_from_paths(item, s3_client)
                
                if presigned_url and presigned_url not in matching_files:
                    matching_files.append(presigned_url)
        
        return matching_files
        
    except Exception as e:
        print(f"Error in species search: {str(e)}")
        return []

def check_species_match(simple_tags, species_query, file_type):
    """
    Check if a species matches, with different logic for audio vs other files
    - For audio files: use substring matching on the part after underscore
    - For other files: use exact matching
    """
    species_query_lower = species_query.lower()
    
    if file_type.startswith('audio'):
        # For audio files: substring matching on part after underscore
        for tag_name, tag_count in simple_tags.items():
            if tag_count >= 1:
                # Extract the part after underscore (common name)
                if '_' in tag_name:
                    common_name = tag_name.split('_', 1)[1].lower()
                else:
                    common_name = tag_name.lower()
                
                if species_query_lower in common_name:
                    print(f"Audio substring match: '{species_query}' found in common name '{common_name}' from tag '{tag_name}'")
                    return True
        return False
    else:
        # For non-audio files: exact matching
        species_count = simple_tags.get(species_query_lower, 0)
        return species_count >= 1

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