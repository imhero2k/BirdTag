import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Handle GET /search/by-species - Find files by bird species (no count requirement)
    NEW: Generates fresh pre-signed URLs from stored S3 keys
    Expected formats:
    - GET: ?species1=crow&species2=pigeon
    - GET: ?species=crow  (single species)
    Returns all files containing at least one of the specified species
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
        species_list = parse_species_parameters(event)
        
        if not species_list:
            return create_error_response(
                400, 'MISSING_PARAMETERS', 'No valid species parameters provided',
                {
                    'expected_format': '?species1=crow&species2=pigeon',
                    'single_format': '?species=crow',
                    'example': '/search/by-species?species1=crow&species2=pigeon'
                }, headers
            )
        
        # Search database for files containing any of the species
        matching_files = search_by_species_with_presigned_urls(species_list)
        
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
        print(f"Unexpected error in species search: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_details': str(e)}, headers
        )

def parse_species_parameters(event):
    """
    Parse GET parameters for species search
    Formats supported:
    - ?species1=crow&species2=pigeon&species3=eagle
    - ?species=crow (single species)
    Returns: ['crow', 'pigeon', 'eagle']
    """
    query_params = event.get('queryStringParameters') or {}
    species_list = []
    
    print(f"Raw query parameters: {query_params}")
    
    # Handle single species parameter
    if 'species' in query_params:
        species_name = query_params['species'].lower().strip()
        if species_name:
            species_list.append(species_name)
    
    # Handle numbered species parameters (species1, species2, etc.)
    species_numbers = set()
    for key in query_params.keys():
        if key.startswith('species') and key != 'species':
            species_num = key[7:]  # Extract number from 'species1', 'species2', etc.
            if species_num.isdigit():
                species_numbers.add(species_num)
    
    # Extract species from numbered parameters
    for species_num in species_numbers:
        species_key = f'species{species_num}'
        if species_key in query_params:
            species_name = query_params[species_key].lower().strip()
            if species_name and species_name not in species_list:
                species_list.append(species_name)
    
    print(f"Parsed species list: {species_list}")
    return species_list

def search_by_species_with_presigned_urls(species_list):
    """
    Search for files containing any of the specified species (OR logic)
    NEW: Generate fresh pre-signed URLs from S3 keys
    Uses at least one occurrence of any species (count >= 1)
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        s3_client = boto3.client('s3')  # For generating URLs
        
        print(f"Searching for species: {species_list}")
        
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
            
            # Convert DynamoDB format to simple format
            simple_tags = convert_dynamodb_tags(file_tags)
            print(f"Item {item.get('file_id', 'unknown')}: {simple_tags}")
            
            # Check if file contains any of the required species (OR logic)
            contains_species = False
            for species in species_list:
                species_count = simple_tags.get(species.lower(), 0)
                if species_count >= 1:  # At least one occurrence
                    contains_species = True
                    print(f"Found {species}: {species_count}")
                    break
            
            # Generate fresh pre-signed URL if any species found
            if contains_species:
                presigned_url = generate_appropriate_presigned_url(item, s3_client)
                
                if presigned_url and presigned_url not in matching_files:
                    matching_files.append(presigned_url)
                    print(f"Added to results: {presigned_url[:50]}...")
            else:
                print(f"No matching species found")
        
        print(f"Final matching files: {len(matching_files)} URLs generated")
        return matching_files
        
    except ClientError as e:
        print(f"DynamoDB error in species search: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error in database search: {str(e)}")
        return []

def generate_appropriate_presigned_url(item, s3_client):
    """
    Generate appropriate pre-signed URL based on file type
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
            print(f"Warning: No valid S3 key found for file_id: {item.get('file_id')}")
            return None
        
        # Generate fresh pre-signed URL (5 hours expiration)
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
    """
    Convert DynamoDB native format to simple format
    Input:  {"Peacock": Decimal('1'), "Crow": {"N": "5"}}
    Output: {"peacock": 1, "crow": 5}
    """
    simple_tags = {}
    
    for tag_name, tag_value in file_tags.items():
        try:
            if isinstance(tag_value, Decimal):
                # boto3 returns Decimals for DynamoDB numbers
                simple_tags[tag_name.lower()] = int(tag_value)
            elif isinstance(tag_value, dict):
                # DynamoDB native format
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