# Create Lambda layer for Langchain Core
resource "aws_lambda_layer_version" "lambda_layer_langchain_core" {
  filename            = data.archive_file.lambda_layer_langchain_core.output_path
  source_code_hash    = data.archive_file.lambda_layer_langchain_core.output_base64sha256
  layer_name          = "${local.prefix}-langchain-core-layer"
  description         = "Langchain Core lambda layer"
  compatible_runtimes = ["python3.12"] 
  compatible_architectures = ["x86_64"]
}

# Create Lambda layer for Langchain AWS
resource "aws_lambda_layer_version" "lambda_layer_langchain_aws" {
  filename            = data.archive_file.lambda_layer_langchain_aws.output_path
  source_code_hash    = data.archive_file.lambda_layer_langchain_aws.output_base64sha256
  layer_name          = "${local.prefix}-langchain-aws-layer"
  description         = "Langchain AWS lambda layer"
  compatible_runtimes = ["python3.12"] 
  compatible_architectures = ["x86_64"]
}

# Create Lambda layer for Langgraph
resource "aws_lambda_layer_version" "lambda_layer_langgraph" {
  filename            = data.archive_file.lambda_layer_langgraph.output_path
  source_code_hash    = data.archive_file.lambda_layer_langgraph.output_base64sha256
  layer_name          = "${local.prefix}-langgraph-layer"
  description         = "Langgraph lambda layer"
  compatible_runtimes = ["python3.12"] 
  compatible_architectures = ["x86_64"]
}

# Create Lambda layer for Authorization
resource "aws_lambda_layer_version" "lambda_layer_authorization" {
  filename            = data.archive_file.lambda_layer_authorization.output_path
  source_code_hash    = data.archive_file.lambda_layer_authorization.output_base64sha256
  layer_name          = "${local.prefix}-authorization-layer"
  description         = "Authorization lambda layer"
  compatible_runtimes = ["python3.12"] 
  compatible_architectures = ["x86_64"]
}


# # Create Lambda layer
# resource "aws_lambda_layer_version" "lambda_layer_backend" {
#   filename            = data.archive_file.lambda_layer_backend.output_path
#   layer_name         = "${local.prefix}-backend-layer"
#   description        = "Langachain lambda layer"
#   compatible_runtimes = ["python3.12"] 

#   compatible_architectures = ["x86_64"]
# }