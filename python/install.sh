#!/bin/bash

# Check if two arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <input_folder> <output_folder>"
    exit 1
fi

# Assign input arguments to variables
INPUT_FOLDER=$1
OUTPUT_FOLDER=$2


# Perform file copying operations
cp "$INPUT_FOLDER/out/index.html" "$OUTPUT_FOLDER/web/templates/editor/index.html"
cp "$INPUT_FOLDER/python/editor_api.py" "$OUTPUT_FOLDER/web/editor_api.py"
cp "$INPUT_FOLDER/python/editor.py" "$OUTPUT_FOLDER/web/editor.py"
cp "$INPUT_FOLDER/python/urls.py" "$OUTPUT_FOLDER/web/website/urls.py"

echo "Files copied!"