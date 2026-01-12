#!/bin/bash

# AWS Setup Script for BirdTag
# This script helps automate the AWS resource creation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${GREEN}Starting AWS Setup for BirdTag${NC}"
echo -e "Region: ${REGION}"
echo -e "Account ID: ${ACCOUNT_ID}"
echo ""

# Function to check if resource exists
check_resource_exists() {
    local resource_type=$1
    local resource_name=$2
    
    case $resource_type in
        s3)
            aws s3 ls "s3://${resource_name}" 2>/dev/null && return 0 || return 1
            ;;
        dynamodb)
            aws dynamodb describe-table --table-name "${resource_name}" --region "${REGION}" 2>/dev/null && return 0 || return 1
            ;;
        lambda)
            aws lambda get-function --function-name "${resource_name}" --region "${REGION}" 2>/dev/null && return 0 || return 1
            ;;
        *)
            return 1
            ;;
    esac
}

# Step 1: Create S3 Buckets
echo -e "${YELLOW}Step 1: Creating S3 Buckets...${NC}"

BUCKETS=("lambdatestbucket134" "mbb-media-bucket-134" "modelbucket134" "thumbnailbucket134" "resultbucket134")

for bucket in "${BUCKETS[@]}"; do
    if check_resource_exists s3 "$bucket"; then
        echo -e "  ${YELLOW}Bucket ${bucket} already exists, skipping...${NC}"
    else
        echo -e "  Creating bucket: ${bucket}"
        if aws s3 mb "s3://${bucket}" --region "${REGION}" 2>/dev/null; then
            echo -e "  ${GREEN}✓ Created ${bucket}${NC}"
        else
            echo -e "  ${RED}✗ Failed to create ${bucket} (may already exist or name taken)${NC}"
        fi
    fi
done

# Configure CORS for main buckets
echo -e "\n${YELLOW}Configuring CORS for S3 buckets...${NC}"
cat > /tmp/cors-config.json << 'EOF'
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

for bucket in "lambdatestbucket134" "mbb-media-bucket-134" "thumbnailbucket134"; do
    if aws s3api put-bucket-cors --bucket "$bucket" --cors-configuration file:///tmp/cors-config.json 2>/dev/null; then
        echo -e "  ${GREEN}✓ Configured CORS for ${bucket}${NC}"
    else
        echo -e "  ${YELLOW}⚠ Could not configure CORS for ${bucket}${NC}"
    fi
done

# Step 2: Create DynamoDB Table
echo -e "\n${YELLOW}Step 2: Creating DynamoDB Table...${NC}"
TABLE_NAME="BirdMediaMetadata"

if check_resource_exists dynamodb "$TABLE_NAME"; then
    echo -e "  ${YELLOW}Table ${TABLE_NAME} already exists, skipping...${NC}"
else
    echo -e "  Creating table: ${TABLE_NAME}"
    if aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions AttributeName=file_id,AttributeType=S \
        --key-schema AttributeName=file_id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${REGION}" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Created ${TABLE_NAME}${NC}"
        echo -e "  ${YELLOW}  Waiting for table to be active...${NC}"
        aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "${REGION}"
    else
        echo -e "  ${RED}✗ Failed to create ${TABLE_NAME}${NC}"
    fi
fi

# Step 3: Create IAM Role
echo -e "\n${YELLOW}Step 3: Creating IAM Role (LabRole)...${NC}"

if aws iam get-role --role-name LabRole > /dev/null 2>&1; then
    echo -e "  ${YELLOW}Role LabRole already exists, skipping...${NC}"
else
    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
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

    if aws iam create-role \
        --role-name LabRole \
        --assume-role-policy-document file:///tmp/trust-policy.json > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Created LabRole${NC}"
        
        # Attach basic execution policy
        aws iam attach-role-policy \
            --role-name LabRole \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Create custom policy
        cat > /tmp/labrole-policy.json << EOF
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
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/BirdMediaMetadata"
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
            --policy-document file:///tmp/labrole-policy.json
        
        echo -e "  ${GREEN}✓ Attached policies to LabRole${NC}"
    else
        echo -e "  ${RED}✗ Failed to create LabRole${NC}"
    fi
fi

# Step 4: Upload ML Models
echo -e "\n${YELLOW}Step 4: Uploading ML Models...${NC}"

if [ -f "audioPrediction/BirdNET_Model.tflite" ]; then
    if aws s3 cp audioPrediction/BirdNET_Model.tflite "s3://modelbucket134/BirdNET_Model.tflite" --region "${REGION}" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Uploaded BirdNET_Model.tflite${NC}"
    else
        echo -e "  ${YELLOW}⚠ Could not upload BirdNET_Model.tflite${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ BirdNET_Model.tflite not found, skipping...${NC}"
fi

if [ -f "audioPrediction/BirdNET_Labels.txt" ]; then
    if aws s3 cp audioPrediction/BirdNET_Labels.txt "s3://modelbucket134/labels.txt" --region "${REGION}" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Uploaded labels.txt${NC}"
    else
        echo -e "  ${YELLOW}⚠ Could not upload labels.txt${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ BirdNET_Labels.txt not found, skipping...${NC}"
fi

# Summary
echo -e "\n${GREEN}=== Setup Summary ===${NC}"
echo -e "Account ID: ${ACCOUNT_ID}"
echo -e "Region: ${REGION}"
echo -e ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Create Cognito User Pool (use AWS Console or CLI - see AWS_SETUP_GUIDE.md)"
echo -e "2. Create Lambda functions (package and deploy - see AWS_SETUP_GUIDE.md)"
echo -e "3. Create API Gateway (use AWS Console - see AWS_SETUP_GUIDE.md)"
echo -e "4. Update UI/src/aws-exports.js with your Cognito User Pool ID and Client ID"
echo -e ""
echo -e "${GREEN}Setup script completed!${NC}"
echo -e "See AWS_SETUP_GUIDE.md for detailed instructions on remaining steps."


