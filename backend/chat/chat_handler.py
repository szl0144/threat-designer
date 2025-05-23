import json
import os
import boto3
import decimal
from typing import Dict, Any, Union, List
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
import traceback

logger = Logger()
tracer = Tracer()

# Initialize AWS clients
dynamodb_resource = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('REGION', 'us-east-1'))

# Environment variables
AGENT_STATE_TABLE = os.environ.get('AGENT_STATE_TABLE')


def convert_decimals(
    obj: Union[List[Any], Dict[Any, Any], decimal.Decimal, Any],
) -> Union[List[Any], Dict[Any, Any], int, float, Any]:
    """Recursively converts Decimal to float or int in a dictionary."""
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, decimal.Decimal):
        return (
            int(obj) if obj % 1 == 0 else float(obj)
        )  # Convert to int if it's a whole number
    else:
        return obj


def cors_headers(origin: str = "*") -> Dict[str, str]:
    """Return CORS headers for cross-origin requests"""
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }


def get_threat_model_from_db(threat_model_id: str) -> Dict[str, Any]:
    """Retrieve threat model data from DynamoDB using job_id"""
    try:
        table = dynamodb_resource.Table(AGENT_STATE_TABLE)
        response = table.get_item(
            Key={'job_id': threat_model_id}
        )
        
        if 'Item' not in response:
            raise ValueError(f"Threat model with ID {threat_model_id} not found")
        
        # Convert Decimal types before returning
        return convert_decimals(response['Item'])
        
    except Exception as e:
        logger.error(f"Error retrieving threat model: {str(e)}")
        raise


def invoke_bedrock_model(prompt: str, threat_model_data: Dict[str, Any], model_id: str) -> str:
    """Invoke Bedrock model with prompt and threat model context using provided model_id"""
    try:
        # Prepare context from threat model data
        context = f"""
Based on the following threat model data:

Threat Model ID: {threat_model_data.get('job_id', 'N/A')}
Application Name: {threat_model_data.get('title', 'N/A')}
Description: {threat_model_data.get('description', 'N/A')}

Threat Model Details:
{json.dumps(threat_model_data, indent=2)}

Please answer the following question:
{prompt}

Provide a detailed, professional response that is relevant to the threat model context.
"""

        # Prepare request body based on model type
        if 'claude' in model_id.lower():
            # Claude 3.x model format - use Messages API
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4000,
                "temperature": 0.1,  # Lower temperature for more consistent responses
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": context
                            }
                        ]
                    }
                ]
            }
        elif 'nova' in model_id.lower():
            # Amazon Nova model format
            body = {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": context}]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 4000,
                    "temperature": 0.1
                }
            }
        else:
            # Default format for other models
            body = {
                "inputText": context,
                "textGenerationConfig": {
                    "maxTokenCount": 4000,
                    "temperature": 0.1
                }
            }
        
        # Log the request for debugging (remove sensitive data)
        logger.info(f"Invoking model {model_id}")
        
        # Invoke the model with timeout handling
        try:
            response = bedrock_runtime.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType='application/json',
                accept='application/json'
            )
        except Exception as bedrock_error:
            logger.error(f"Bedrock API error: {str(bedrock_error)}")
            if "ValidationException" in str(bedrock_error):
                raise Exception(f"Invalid model configuration for {model_id}. Please check the model ID and parameters.")
            elif "AccessDeniedException" in str(bedrock_error):
                raise Exception(f"Access denied to model {model_id}. Please ensure the model is enabled in your AWS account.")
            elif "ThrottlingException" in str(bedrock_error):
                raise Exception("Service is currently busy. Please try again in a moment.")
            else:
                raise Exception(f"Failed to invoke model: {str(bedrock_error)}")
        
        # Parse response
        response_body = json.loads(response['body'].read())
        logger.info(f"Received response from model {model_id}")
        
        # Extract text based on model type
        if 'claude' in model_id.lower():
            # Claude 3.x response format
            if 'content' in response_body and len(response_body['content']) > 0:
                ai_response = response_body['content'][0]['text']
            else:
                logger.error(f"Unexpected Claude response format: {response_body}")
                raise Exception("Received invalid response from Claude model")
        elif 'nova' in model_id.lower():
            if 'output' in response_body and 'message' in response_body['output']:
                ai_response = response_body['output']['message']['content'][0]['text']
            else:
                logger.error(f"Unexpected Nova response format: {response_body}")
                raise Exception("Received invalid response from Nova model")
        else:
            ai_response = response_body.get('results', [{}])[0].get('outputText', 'No response generated')
        
        # Log successful response
        logger.info(f"Successfully processed response from {model_id}")
        
        return ai_response
            
    except Exception as e:
        logger.error(f"Error invoking Bedrock model: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


@tracer.capture_lambda_handler
@logger.inject_lambda_context
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """Main Lambda handler for chat requests - simplified without validation"""
    try:
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Parse request body
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event
        
        # Extract parameters (no validation)
        prompt = body.get('prompt', '')
        threat_model_id = body.get('threat_model_id', '')
        model_id = body.get('model_id', 'anthropic.claude-3-sonnet-20240229-v1:0')
        
        # Get threat model data from DynamoDB
        logger.info(f"Retrieving threat model: {threat_model_id}")
        threat_model_data = get_threat_model_from_db(threat_model_id)
        
        # Invoke Bedrock model directly with provided model_id
        logger.info(f"Invoking Bedrock model: {model_id}")
        ai_response = invoke_bedrock_model(prompt, threat_model_data, model_id)
        
        # Return successful response
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'response': ai_response,
                'status': 'success',
                'threat_model_id': threat_model_id,
                'model_used': model_id
            })
        }
        
    except ValueError as e:
        logger.error(f"Data error: {str(e)}")
        return {
            'statusCode': 404,
            'headers': cors_headers(),
            'body': json.dumps({
                'error': str(e),
                'status': 'error'
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({
                'error': 'Internal server error',
                'status': 'error'
            })
        } 