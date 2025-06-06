import json
import boto3
from botocore.exceptions import ClientError
import jwt

def lambda_handler(event, context):
    """
    Exchange Cognito ID token for temporary AWS credentials using LabRole
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    try:
        if event['httpMethod'] == 'OPTIONS':
            return {'statusCode': 200, 'headers': headers, 'body': ''}
        
        body = json.loads(event['body'])
        id_token = body.get('idToken')
        
        if not id_token:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'idToken is required'})
            }
        
        # Decode token (simplified for demo)
        try:
            decoded_token = jwt.decode(id_token, options={"verify_signature": False})
            user_id = decoded_token.get('sub')
            user_email = decoded_token.get('email', 'unknown')
        except:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid token'})
            }
        
        # Assume LabRole
        sts_client = boto3.client('sts')
        account_id = sts_client.get_caller_identity()['Account']
        lab_role_arn = f"arn:aws:iam::{account_id}:role/LabRole"
        
        assume_role_response = sts_client.assume_role(
            RoleArn=lab_role_arn,
            RoleSessionName=f"BirdTag-{user_id[:8]}",
            DurationSeconds=3600
        )
        
        credentials = assume_role_response['Credentials']
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'accessKeyId': credentials['AccessKeyId'],
                'secretAccessKey': credentials['SecretAccessKey'],
                'sessionToken': credentials['SessionToken'],
                'expiration': credentials['Expiration'].isoformat(),
                'userInfo': {
                    'userId': user_id,
                    'email': user_email
                }
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }