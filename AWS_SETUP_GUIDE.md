# AWS Setup Guide for BirdTag

This guide will help you set up all AWS resources from scratch for the BirdTag application.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured (`aws configure`)
3. Basic knowledge of AWS services

## Step 1: Create S3 Buckets

Create the following S3 buckets (choose unique names if these are taken):

```bash
# Main media storage bucket
aws s3 mb s3://lambdatestbucket134 --region us-east-1

# Alternative main bucket (used in aws-exports.js)
aws s3 mb s3://mbb-media-bucket-134 --region us-east-1

# Model storage bucket (for ML models)
aws s3 mb s3://modelbucket134 --region us-east-1

# Thumbnail bucket
aws s3 mb s3://thumbnailbucket134 --region us-east-1

# Optional: Result bucket for processed files
aws s3 mb s3://resultbucket134 --region us-east-1
```

**Note:** S3 bucket names must be globally unique. If these names are taken, choose different names and update the configuration files accordingly.

### Configure CORS for S3 Buckets

For each bucket, configure CORS to allow web app access:

```bash
# Create CORS configuration file (cors-config.json)
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS to each bucket
aws s3api put-bucket-cors --bucket lambdatestbucket134 --cors-configuration file://cors-config.json
aws s3api put-bucket-cors --bucket mbb-media-bucket-134 --cors-configuration file://cors-config.json
aws s3api put-bucket-cors --bucket thumbnailbucket134 --cors-configuration file://cors-config.json
```

### Upload ML Models

Upload the BirdNET model to the model bucket:

```bash
aws s3 cp audioPrediction/BirdNET_Model.tflite s3://modelbucket134/BirdNET_Model.tflite
aws s3 cp audioPrediction/BirdNET_Labels.txt s3://modelbucket134/labels.txt
```

## Step 2: Create DynamoDB Table

Create the `BirdMediaMetadata` table:

```bash
aws dynamodb create-table \
  --table-name BirdMediaMetadata \
  --attribute-definitions \
    AttributeName=file_id,AttributeType=S \
  --key-schema \
    AttributeName=file_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Schema:**
- **Primary Key:** `file_id` (String)
- **Attributes:**
  - `original_s3_path` (String) - S3 path to original file
  - `thumbnail_s3_path` (String) - S3 path to thumbnail
  - `result_s3_path` (String) - S3 path to processed result
  - `file_type` (String) - image, video, or audio
  - `upload_date` (String) - ISO timestamp
  - `tags` (Map) - Nested structure with species counts
  - `species_detected` (List) - List of detected species
  - Other metadata fields as needed

## Step 3: Create Cognito User Pool

### Using AWS Console:
1. Go to AWS Cognito Console
2. Click "Create user pool"
3. Configure sign-in options: Choose "Email"
4. Configure security requirements: Use default settings
5. Configure sign-up experience: Keep defaults
6. Configure message delivery: Use Cognito default
7. Integrate your app:
   - User pool name: `BirdTagUserPool`
   - App client name: `BirdTagWebClient`
   - Uncheck "Generate client secret" (for public clients)
8. Review and create

### Using AWS CLI:

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name BirdTagUserPool \
  --policies PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false} \
  --auto-verified-attributes email \
  --region us-east-1

# Note the UserPoolId from the response, then create app client
aws cognito-idp create-user-pool-client \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --client-name BirdTagWebClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1
```

**After creation, update `UI/src/aws-exports.js` with:**
- `aws_user_pools_id` - Your User Pool ID
- `aws_user_pools_web_client_id` - Your App Client ID

## Step 4: Create IAM Role (LabRole)

Create an IAM role that Lambda functions can assume:

```bash
# Create trust policy file
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name LabRole \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name LabRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach custom policy for S3, DynamoDB, and STS access
cat > labrole-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::lambdatestbucket134",
        "arn:aws:s3:::lambdatestbucket134/*",
        "arn:aws:s3:::mbb-media-bucket-134",
        "arn:aws:s3:::mbb-media-bucket-134/*",
        "arn:aws:s3:::modelbucket134",
        "arn:aws:s3:::modelbucket134/*",
        "arn:aws:s3:::thumbnailbucket134",
        "arn:aws:s3:::thumbnailbucket134/*",
        "arn:aws:s3:::resultbucket134",
        "arn:aws:s3:::resultbucket134/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/BirdMediaMetadata"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name LabRole \
  --policy-name LabRoleS3DynamoPolicy \
  --policy-document file://labrole-policy.json
```

## Step 5: Create Lambda Functions

### 5.1 Package Lambda Functions

For each Lambda function, you'll need to:
1. Package the code
2. Create the Lambda function
3. Configure environment variables
4. Set up API Gateway integration

### Example: Upload Lambda

```bash
# Package the upload function
cd api
zip upload.zip upload.py

# Create Lambda function
aws lambda create-function \
  --function-name BirdTag-Upload \
  --runtime python3.11 \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/LabRole \
  --handler upload.lambda_handler \
  --zip-file fileb://upload.zip \
  --timeout 30 \
  --region us-east-1
```

### Create All API Lambda Functions

Repeat for each function in the `api/` directory:
- `upload.py` → `BirdTag-Upload`
- `delete.py` → `BirdTag-Delete`
- `assume_role.py` → `BirdTag-AssumeRole`
- `search_by_tags.py` → `BirdTag-SearchByTags`
- `search_by_species_no_count.py` → `BirdTag-SearchBySpecies`
- `search_by_file_tag.py` → `BirdTag-SearchByFileTag`
- `search_by_thumbnail_url.py` → `BirdTag-SearchByThumbnail`
- `show_gallery.py` → `BirdTag-ShowGallery`
- `manual_bulk_tagging.py` → `BirdTag-ManualBulkTagging`

### 5.2 Create Processing Lambda Functions

#### Visual Prediction Lambda (Docker-based)

```bash
cd VisualPrediction

# Build and push Docker image (requires Docker and ECR setup)
# Or use zip deployment with dependencies

# Create Lambda function with container image
aws lambda create-function \
  --function-name BirdTag-VisualPrediction \
  --package-type Image \
  --code ImageUri=<ECR_IMAGE_URI> \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/LabRole \
  --timeout 900 \
  --memory-size 3008 \
  --region us-east-1
```

#### Audio Prediction Lambda (Docker-based)

```bash
cd audioPrediction

# Similar to visual prediction, requires Docker image
aws lambda create-function \
  --function-name BirdTag-AudioPrediction \
  --package-type Image \
  --code ImageUri=<ECR_IMAGE_URI> \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/LabRole \
  --timeout 900 \
  --memory-size 3008 \
  --environment Variables="{
    DYNAMO_TABLE=BirdMediaMetadata,
    MODEL_BUCKET=modelbucket134,
    MODEL_KEY=BirdNET_Model.tflite,
    LABELS_KEY=labels.txt,
    MIN_CONF=0.25
  }" \
  --region us-east-1
```

### 5.3 Configure S3 Event Triggers

Set up S3 event notifications to trigger processing Lambdas:

```bash
# Create notification configuration for visual processing
cat > s3-notification-config.json << 'EOF'
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:BirdTag-VisualPrediction",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".jpg"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket lambdatestbucket134 \
  --notification-configuration file://s3-notification-config.json
```

## Step 6: Create API Gateway

### Option 1: REST API

```bash
# Create REST API
aws apigateway create-rest-api \
  --name BirdTagAPI \
  --description "BirdTag API Gateway" \
  --region us-east-1

# Note the API ID, then create resources and methods
# This is complex - consider using AWS Console or Infrastructure as Code
```

### Option 2: HTTP API (Simpler)

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name BirdTagAPI \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="*" \
  --region us-east-1
```

**Recommended:** Use AWS Console for API Gateway setup as it's more visual and easier to configure integrations.

## Step 7: Update Configuration Files

### Update `UI/src/aws-exports.js`:

```javascript
const awsmobile = {
  aws_project_region: "us-east-1",
  aws_cognito_region: "us-east-1",
  aws_user_pools_id: "<YOUR_USER_POOL_ID>",
  aws_user_pools_web_client_id: "<YOUR_CLIENT_ID>",
  aws_user_files_s3_bucket: "mbb-media-bucket-134", // or lambdatestbucket134
  aws_user_files_s3_bucket_region: "us-east-1",
  oauth: {}
};

export default awsmobile;
```

### Update `UI/src/index.js`:

Update the bucket name in the Storage configuration if needed.

## Step 8: Testing

1. **Test Cognito:**
   - Create a test user in Cognito User Pool
   - Test login in the React app

2. **Test S3 Upload:**
   - Try uploading a file through the UI
   - Verify it appears in S3 bucket

3. **Test Lambda Functions:**
   - Test each Lambda function individually
   - Check CloudWatch logs for errors

4. **Test API Gateway:**
   - Test API endpoints
   - Verify CORS headers

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Ensure CORS is configured on S3 buckets
   - Check API Gateway CORS settings
   - Verify Lambda response headers

2. **Permission Errors:**
   - Check IAM role policies
   - Verify Lambda execution role
   - Check S3 bucket policies

3. **Lambda Timeout:**
   - Increase Lambda timeout (max 15 minutes)
   - Check CloudWatch logs
   - Optimize code if needed

4. **DynamoDB Errors:**
   - Verify table exists
   - Check IAM permissions
   - Verify table name matches code

## Next Steps

1. Set up CloudWatch alarms for monitoring
2. Configure CloudFront for CDN (optional)
3. Set up CI/CD pipeline (optional)
4. Configure backup strategies
5. Set up cost monitoring and budgets

## Cost Estimation

Approximate monthly costs (varies by usage):
- S3: ~$0.023 per GB storage + transfer costs
- DynamoDB: Pay-per-request pricing
- Lambda: First 1M requests free, then $0.20 per 1M requests
- Cognito: First 50K MAU free
- API Gateway: $1.00 per million API calls

## Security Best Practices

1. Enable S3 bucket versioning
2. Enable S3 bucket encryption
3. Use least privilege IAM policies
4. Enable CloudTrail for audit logging
5. Use VPC for Lambda functions if handling sensitive data
6. Rotate access keys regularly
7. Enable MFA for AWS account

---

**Note:** Replace `<YOUR_ACCOUNT_ID>`, `<YOUR_USER_POOL_ID>`, and `<YOUR_CLIENT_ID>` with your actual values throughout this guide.


