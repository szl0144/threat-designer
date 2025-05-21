#!/bin/bash

build_path=build

[[ -z "$build_path" ]] && echo "ERROR: build_path is not defined" && exit 1

pwd
ROOT=$PWD

# Define build paths
authorizer_build_path=${build_path}/authorizer_code/
td_build_path=${build_path}/threat_designer_code/
backend_build_path=${build_path}/backend_code/
langchain_core_layer_path=${build_path}/langchain_core_code/
langchain_aws_layer_path=${build_path}/langchain_aws_code/
langgraph_layer_path=${build_path}/langgraph_code/
auth_layer_path=${build_path}/authorization_deps_code/

# Clean up existing build directories
rm -rf $authorizer_build_path
rm -rf $td_build_path
rm -rf $backend_build_path
rm -rf $langchain_core_layer_path
rm -rf $langchain_aws_layer_path
rm -rf $langgraph_layer_path
rm -rf $auth_layer_path

# Create new build directories
mkdir -p $authorizer_build_path
mkdir -p $td_build_path
mkdir -p $backend_build_path
mkdir -p $langchain_core_layer_path
mkdir -p $langchain_aws_layer_path
mkdir -p $langgraph_layer_path
mkdir -p $auth_layer_path

echo "Building lambda layers"
cd $ROOT

# Build authorizer lambda layer
if [[ -f ../backend/dependencies/requirements-authorizer.txt ]]; then
    echo "Installing authorizer packages..."
    pip3 install --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: --python-version 3.12 -r ../backend/dependencies/requirements-authorizer.txt --target $auth_layer_path/python
fi

# Build langchain core lambda layer
if [[ -f ../backend/dependencies/requirements-langchain-core.txt ]]; then
    echo "Installing langchain core packages..."
    pip3 install --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: --python-version 3.12 --no-cache-dir -r ../backend/dependencies/requirements-langchain-core.txt --target $langchain_core_layer_path/python
fi



# Build langchain AWS lambda layer
if [[ -f ../backend/dependencies/requirements-langchain-aws.txt ]]; then
    echo "Installing langchain AWS packages..."
    pip3 install --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: --python-version 3.12 --no-cache-dir -r ../backend/dependencies/requirements-langchain-aws.txt --target $langchain_aws_layer_path/python
fi

find $langchain_aws_layer_path/python -name "*.dist-info" -type d -exec rm -rf {} +
find $langchain_aws_layer_path/python -name "*.egg-info" -type d -exec rm -rf {} +
find $langchain_aws_layer_path/python -name "__pycache__" -type d -exec rm -rf {} +
find $langchain_aws_layer_path/python -name "*.pyc" -delete

# Build langgraph lambda layer
if [[ -f ../backend/dependencies/requirements-langgraph.txt ]]; then
    echo "Installing langgraph packages..."
    pip3 install --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: --python-version 3.12 -r ../backend/dependencies/requirements-langgraph.txt --target $langgraph_layer_path/python
fi

cd $ROOT
echo "Building authorizer lambda"
cp -r ../backend/authorizer/* $authorizer_build_path/

cd $ROOT
echo "Building threat designer lambda"
cp -r ../backend/threat_designer/* $td_build_path/

cd $ROOT
echo "Building backend lambda"
cp -r ../backend/app/* $backend_build_path/