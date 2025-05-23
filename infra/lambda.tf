resource "aws_lambda_function" "threat_designer" {
  filename                       = data.archive_file.td_lambda_code_zip.output_path
  source_code_hash               = data.archive_file.td_lambda_code_zip.output_base64sha256
  function_name    = "${local.prefix}-lambda"
  role            = aws_iam_role.threat_designer_role.arn
  handler         = "index.lambda_handler"
  runtime         = local.python_version
  memory_size     = 2048
  publish         = true
  timeout         = 900
  
  tracing_config {
    mode = "Active"
  }
  
  environment {
    variables = {
      AGENT_STATE_TABLE   = aws_dynamodb_table.threat_designer_state.id,
      JOB_STATUS_TABLE    = aws_dynamodb_table.threat_designer_status.id,
      AGENT_TRAIL_TABLE   = aws_dynamodb_table.threat_designer_trail.id,
      REGION              = var.region,
      ARCHITECTURE_BUCKET = aws_s3_bucket.architecture_bucket.id,
      MAIN_MODEL          = jsonencode(var.model_main)
      MODEL_STRUCT        = jsonencode(var.model_struct)
      REASONING_MODELS    = jsonencode(var.reasoning_models)
    }
  }

  depends_on = [
    null_resource.build
  ]
  layers = [ 
    local.powertools_layer_arn, 
    aws_lambda_layer_version.lambda_layer_langchain_core.arn,
    aws_lambda_layer_version.lambda_layer_langchain_aws.arn,
    aws_lambda_layer_version.lambda_layer_langgraph.arn
  ]
}

resource "aws_iam_role" "threat_designer_role" {
  name = "${local.prefix}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_tm_policy" {
  name = "${local.prefix}-policy"
  role = aws_iam_role.threat_designer_role.id
  policy = templatefile("${path.module}/templates/threat_designer_lambda_role_policy.json", {
    state_table_arn = aws_dynamodb_table.threat_designer_state.arn,
    trail_table_arn = aws_dynamodb_table.threat_designer_trail.arn,
    status_table_arn = aws_dynamodb_table.threat_designer_status.arn,
    architecture_bucket = aws_s3_bucket.architecture_bucket.arn
  })
}




#======================== Backend Lambda ======================

resource "aws_lambda_function" "backend" {
  description                    = "Lambda function for threat designer api"
  filename                       = data.archive_file.backend_lambda_code_zip.output_path
  source_code_hash               = data.archive_file.backend_lambda_code_zip.output_base64sha256
  function_name                  = "${local.prefix}-lambda-backend"
  handler                        = "index.lambda_handler"
  memory_size                    = 512
  publish                        = true
  role                           = aws_iam_role.threat_designer_api_role.arn
  reserved_concurrent_executions = var.lambda_concurrency
  runtime                        = local.python_version
  environment {
    variables = {
      LOG_LEVEL              = "INFO",
      REGION                 = var.region,
      PORTAL_REDIRECT_URL    = "https://www.reinforce-com326.com"
      TRUSTED_ORIGINS        = "https://${aws_amplify_branch.develop.branch_name}.${aws_amplify_app.threat-designer.default_domain},http://localhost:5173,https://www.reinforce-com326.com"
      THREAT_MODELING_LAMBDA = aws_lambda_function.threat_designer.id,
      AGENT_STATE_TABLE      = aws_dynamodb_table.threat_designer_state.id,
      AGENT_TRAIL_TABLE      = aws_dynamodb_table.threat_designer_trail.id,
      JOB_STATUS_TABLE       = aws_dynamodb_table.threat_designer_status.id,
      ARCHITECTURE_BUCKET    = aws_s3_bucket.architecture_bucket.id
    }
  }
  timeout = 600
  tracing_config {
    mode = "Active"
  }
  layers = [local.powertools_layer_arn]
}

resource "aws_iam_role" "threat_designer_api_role" {
  name = "${local.prefix}-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_threat_designer_api_policy" {
  name = "${local.prefix}-api-policy"
  role = aws_iam_role.threat_designer_api_role.id
  policy = templatefile("${path.module}/templates/backend_lambda_execution_role_policy.json", {
    state_table_arn = aws_dynamodb_table.threat_designer_state.arn,
    status_table_arn = aws_dynamodb_table.threat_designer_status.arn,
    architecture_bucket = aws_s3_bucket.architecture_bucket.arn,
    threat_modeling_lambda = aws_lambda_function.threat_designer.arn,
    trail_table_arn = aws_dynamodb_table.threat_designer_trail.arn
  })
}

# resource "aws_lambda_provisioned_concurrency_config" "backend" {
#   # depends_on = ["null_resource.alias_provisioned_concurrency_transition_delay"]
#   function_name                     = aws_lambda_alias.backend.function_name
#   provisioned_concurrent_executions = var.provisioned_lambda_concurrency
#   qualifier                         = aws_lambda_alias.backend.name
# }


resource "aws_lambda_alias" "backend" {
  name             = "dev"
  description      = "provisioned concurrency"
  function_name    = aws_lambda_function.backend.arn
  function_version = aws_lambda_function.backend.version
}

#======================== Chat Lambda ======================

resource "aws_lambda_function" "chat" {
  description                    = "Lambda function for threat designer chat API"
  filename                       = data.archive_file.chat_lambda_code_zip.output_path
  source_code_hash               = data.archive_file.chat_lambda_code_zip.output_base64sha256
  function_name                  = "${local.prefix}-lambda-chat"
  handler                        = "chat_handler.lambda_handler"
  memory_size                    = 1024
  publish                        = true
  role                           = aws_iam_role.threat_designer_chat_role.arn
  reserved_concurrent_executions = var.lambda_concurrency
  runtime                        = local.python_version
  environment {
    variables = {
      LOG_LEVEL              = "INFO",
      REGION                 = var.region,
      AGENT_STATE_TABLE      = aws_dynamodb_table.threat_designer_state.id,
      MAIN_MODEL             = jsonencode(var.model_main)
      MODEL_STRUCT           = jsonencode(var.model_struct)
      REASONING_MODELS       = jsonencode(var.reasoning_models)
    }
  }
  timeout = 300
  tracing_config {
    mode = "Active"
  }
  layers = [local.powertools_layer_arn]
}

resource "aws_iam_role" "threat_designer_chat_role" {
  name = "${local.prefix}-chat-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_threat_designer_chat_policy" {
  name = "${local.prefix}-chat-policy"
  role = aws_iam_role.threat_designer_chat_role.id
  policy = templatefile("${path.module}/templates/chat_lambda_execution_role_policy.json", {
    state_table_arn = aws_dynamodb_table.threat_designer_state.arn
  })
}

resource "aws_lambda_alias" "chat" {
  name             = "dev"
  description      = "chat lambda alias"
  function_name    = aws_lambda_function.chat.arn
  function_version = aws_lambda_function.chat.version
}

resource "aws_lambda_permission" "chat_api_gw" {
  statement_id  = "AllowExecutionFromAPIGatewayChat"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chat.function_name
  principal     = "apigateway.amazonaws.com"
  qualifier     = aws_lambda_alias.chat.name
  source_arn = "${aws_api_gateway_rest_api.threat_design_api.execution_arn}/*/*"
}
