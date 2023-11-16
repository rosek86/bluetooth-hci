#!/bin/bash

# Create a temporary directory
TMP_DIR=$(mktemp -d)
echo $TMP_DIR

rm -fr lib/
npm run build.prod

# Copy the contents of /lib to the temporary directory
cp -r lib/* $TMP_DIR/

# Optionally, copy other necessary files like package.json, README.md, etc.
cp package.json $TMP_DIR/
cp README.md $TMP_DIR/
cp LICENSE $TMP_DIR/

# Change to the temporary directory and publish
(
  cd $TMP_DIR
  npm publish
)

# Clean up: Delete the temporary directory
rm -rf $TMP_DIR
