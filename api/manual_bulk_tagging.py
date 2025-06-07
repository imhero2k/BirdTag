import json
import boto3
import re
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from decimal import Decimal

def lambda_handler(event, context):
    """
    Manual addition or removal of tags with bulk tagging
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
                {'expected_format': '{"url": ["url1", "url2"], "operation": 1, "tags": ["crow,1", "pigeon,2"]}'}, headers
            )
        
        # Validate required fields
        urls = body.get('url', [])
        operation = body.get('operation')
        tags = body.get('tags', [])
        
        if not urls or not isinstance(urls, list):
            return create_error_response(
                400, 'INVALID_URLS', 'url field must be a non-empty array',
                {'provided': urls}, headers
            )
        
        if operation not in [0, 1]:
            return create_error_response(
                400, 'INVALID_OPERATION', 'operation must be 0 (remove) or 1 (add)',
                {'provided': operation}, headers
            )
        
        if not tags or not isinstance(tags, list):
            return create_error_response(
                400, 'INVALID_TAGS', 'tags field must be a non-empty array',
                {'provided': tags, 'expected_format': '["crow,1", "pigeon,2"]'}, headers
            )
        
        # Parse and validate tags
        parsed_tags = parse_tags(tags)
        if not parsed_tags:
            return create_error_response(
                400, 'INVALID_TAG_FORMAT', 'No valid tags found',
                {'provided_tags': tags, 'expected_format': '["species,count"]'}, headers
            )
        
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('BirdMediaMetadata')
        
        modified_files = []
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
                
                print(f"Processing URL: {url} -> S3 path: {s3_path}")
                
                # Find database record
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
                
                # Get current tags
                current_tags = database_record.get('tags', {})
                
                # Convert to simple format for processing
                simple_tags = convert_dynamodb_tags(current_tags)
                
                # Apply tag modifications
                if operation == 1:  # Add tags
                    updated_tags = add_tags(simple_tags, parsed_tags)
                    operation_name = 'add'
                else:  # Remove tags
                    updated_tags = remove_tags(simple_tags, parsed_tags)
                    operation_name = 'remove'
                
                # Convert back to DynamoDB format
                dynamodb_tags = convert_to_dynamodb_format(updated_tags)
                
                # Update database record
                update_response = table.update_item(
                    Key={'file_id': file_id},
                    UpdateExpression='SET tags = :tags, last_modified = :timestamp',
                    ExpressionAttributeValues={
                        ':tags': dynamodb_tags,
                        ':timestamp': datetime.now(timezone.utc).isoformat()
                    },
                    ReturnValues='UPDATED_NEW'
                )
                
                # Track successful modification
                modified_files.append({
                    'file_id': file_id,
                    'url': url,
                    'operation': operation_name,
                    'tags_modified': list(parsed_tags.keys()),
                    'tags_before': simple_tags,
                    'tags_after': updated_tags
                })
                
                print(f"Successfully modified tags for file_id: {file_id}")
                
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
            'operation': 'add' if operation == 1 else 'remove',
            'requested_tags': parsed_tags,
            'modified_count': len(modified_files),
            'error_count': len(errors),
            'modified_files': modified_files,
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
        print(f"Unexpected error in modify_tags handler: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_type': type(e).__name__, 'error_details': str(e)}, headers
        )

def parse_tags(tags):
    """
    Parse tags from format ["Crow,1", "Pigeon,2"] to {"Crow": 1, "Pigeon": 2}
    Uses title case for proper species names
    """
    parsed = {}
    
    for tag_str in tags:
        try:
            if ',' in tag_str:
                parts = tag_str.split(',', 1)
                species = parts[0].strip().title()  # Convert to title case
                count_str = parts[1].strip()
                
                if species and count_str.isdigit():
                    count = int(count_str)
                    if count > 0:
                        parsed[species] = count
            else:
                # Handle tags without count (default to 1)
                species = tag_str.strip().title()  # Convert to title case
                if species:
                    parsed[species] = 1
                    
        except Exception as e:
            print(f"Error parsing tag '{tag_str}': {e}")
            continue
    
    return parsed

def add_tags(current_tags, new_tags):
    """Add new tags to current tags"""
    updated_tags = current_tags.copy()
    
    for species, count in new_tags.items():
        current_count = updated_tags.get(species, 0)
        updated_tags[species] = current_count + count
    
    return updated_tags

def remove_tags(current_tags, tags_to_remove):
    """Remove tags from current tags"""
    updated_tags = current_tags.copy()
    
    for species, count in tags_to_remove.items():
        if species in updated_tags:
            current_count = updated_tags[species]
            new_count = max(0, current_count - count)
            
            if new_count == 0:
                # Remove the species entirely if count reaches 0
                del updated_tags[species]
            else:
                updated_tags[species] = new_count
    
    return updated_tags

def convert_to_dynamodb_format(simple_tags):
    """Convert simple tags format to DynamoDB format"""
    dynamodb_tags = {}
    
    for species, count in simple_tags.items():
        dynamodb_tags[species] = Decimal(str(count))
    
    return dynamodb_tags

def convert_url_to_s3_path(url):
    """
    Convert various URL formats to S3 path format using regex
    """
    if not url:
        return None
    
    try:
        # If already S3 path format
        if url.startswith('s3://'):
            return url
        
        # regex pattern for S3 URLs
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

def convert_dynamodb_tags(file_tags):
    """
    Convert DynamoDB format to simple format with title case species names
    """
    simple_tags = {}
    
    for tag_name, tag_value in file_tags.items():
        try:
            # Convert to title case for proper species names
            species_name = tag_name.title()
            
            if isinstance(tag_value, Decimal):
                simple_tags[species_name] = int(tag_value)
            elif isinstance(tag_value, dict):
                if 'N' in tag_value:
                    simple_tags[species_name] = int(tag_value['N'])
                elif 'S' in tag_value:
                    value = tag_value['S']
                    simple_tags[species_name] = int(value) if value.isdigit() else 0
            elif isinstance(tag_value, (int, str)):
                if isinstance(tag_value, str) and tag_value.isdigit():
                    simple_tags[species_name] = int(tag_value)
                elif isinstance(tag_value, int):
                    simple_tags[species_name] = tag_value
        except (ValueError, KeyError):
            simple_tags[tag_name.title()] = 0
    
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