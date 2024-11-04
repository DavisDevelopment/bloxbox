#!/bin/bash

# Create the output directory if it doesn't exist
mkdir -p js_min

# Iterate over all .js files in the './js' directory
for filename in ./js/*.js
do
   # Get the base filename (without the path and extension)
   base=$(basename "$filename" .js)

   # Run uglifyjs on the file and save the output to the js_min directory
   uglifyjs --compress --mangle --beautify --comments all -- "$filename" > "./js_min/$base.js"
done