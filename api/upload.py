import json
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import uuid
import os
from datetime import datetime, timezone
import re

def lambda_handler(event, context):
    """
    Generate presigned URL for S3 upload.
    Handles upload authorization and URL generation.
    Supports both regular and temporary uploads.
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
        
        # Parse and validate request body
        try:
            body = json.loads(event['body'])
        except (json.JSONDecodeError, TypeError):
            return create_error_response(
                400, 'INVALID_JSON', 'Request body must be valid JSON',
                {'received_body': event.get('body', '')}, headers
            )
        
        # Extract and validate required fields
        file_name = body.get('fileName')
        file_type = body.get('fileType')
        is_temporary = body.get('temporary', False)
        
        if not file_name:
            return create_error_response(
                400, 'MISSING_FILENAME', 'fileName is required',
                {'provided_fields': list(body.keys())}, headers
            )
        
        if not file_type:
            return create_error_response(
                400, 'MISSING_FILETYPE', 'fileType is required',
                {'provided_fields': list(body.keys())}, headers
            )
        
        # Validate filename format
        if not re.match(r'^[a-zA-Z0-9._-]+$', file_name):
            return create_error_response(
                400, 'INVALID_FILENAME', 'Filename contains invalid characters',
                {'filename': file_name, 'allowed_chars': 'letters, numbers, dots, hyphens, underscores'}, headers
            )
        
        # Validate file type
        file_type_mapping = {
            'image/jpeg': 'images', 'image/jpg': 'images', 'image/png': 'images', 
            'image/gif': 'images', 'image/webp': 'images',
            'video/mp4': 'videos', 'video/mov': 'videos', 'video/avi': 'videos',
            'video/quicktime': 'videos', 'video/x-msvideo': 'videos',
            'audio/mpeg': 'audio', 'audio/mp3': 'audio', 'audio/wav': 'audio',
            'audio/ogg': 'audio', 'audio/m4a': 'audio'
        }
        
        if file_type not in file_type_mapping:
            return create_error_response(
                400, 'UNSUPPORTED_FILETYPE', 'File type not supported',
                {
                    'provided_type': file_type,
                    'supported_types': list(file_type_mapping.keys())
                }, headers
            )
        
        # Extract user information
        user_id = extract_user_info(event)
        
        # Generate unique S3 key (for upload purposes only)
        timestamp = datetime.now(timezone.utc)
        timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:12]
        
        # Clean filename and extract extension
        clean_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file_name)
        file_extension = clean_filename.split('.')[-1] if '.' in clean_filename else 'unknown'
        
        # Generate S3 key for upload - put temp files in temp/ folder
        if is_temporary:
            upload_key = f"temp/{timestamp_str}_{unique_id}.{file_extension}"
        else:
            upload_key = f"{timestamp_str}_{unique_id}.{file_extension}"
        
        # S3 configuration
        bucket_name = 'lambdatestbucket134'
        
        try:
            # Generate pre-signed URL for upload
            s3_client = boto3.client('s3')
            
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': upload_key,
                    'ContentType': file_type,
                    'Metadata': {
                        'original-filename': clean_filename,
                        'uploader': user_id,
                        'upload-timestamp': timestamp.isoformat(),
                        'file-type': file_type,
                        'is-temporary': str(is_temporary)
                    }
                },
                ExpiresIn=3600  # 1 hour
            )
            
        except NoCredentialsError:
            return create_error_response(
                500, 'AWS_CREDENTIALS_ERROR', 'AWS credentials not configured',
                {'service': 'S3'}, headers
            )
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            return create_error_response(
                500, 'S3_SERVICE_ERROR', 'Failed to generate upload URL',
                {
                    'aws_error_code': error_code,
                    'aws_error_message': str(e),
                    'bucket': bucket_name
                }, headers
            )
        
        # Return response
        response_data = {
            'uploadUrl': presigned_url,
            'bucket': bucket_name,
            's3Key': upload_key,  # For reference, but not the database ID
            'expiresIn': 3600,
            'isTemporary': is_temporary,
            'metadata': {
                'originalFilename': clean_filename,
                'fileType': file_type,
                'uploader': user_id,
                'uploadTime': timestamp.isoformat()
            },
            'message': 'Upload URL generated successfully. File will be processed after upload.' if not is_temporary else 'Temporary upload URL generated. File will be processed and then deleted.'
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return create_error_response(
            500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred',
            {'error_type': type(e).__name__, 'error_details': str(e)}, headers
        )

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

def extract_user_info(event):
    """Extract user information from request context"""
    try:
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        
        # Check for Cognito claims
        if 'claims' in authorizer:
            claims = authorizer['claims']
            return claims.get('email', claims.get('username', 'authenticated_user'))
        
        # Check for Authorization header
        headers = event.get('headers') or {}
        auth_header = headers.get('Authorization') or headers.get('authorization', '')
        
        if auth_header and auth_header.startswith('Bearer '):
            return 'token_authenticated_user'
        
        return 'anonymous_user'
        
    except Exception as e:
        print(f"Error extracting user info: {e}")
        return 'unknown_user'