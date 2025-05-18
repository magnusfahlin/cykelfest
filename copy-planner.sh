#!/bin/bash

# Remove the 'planner' directory if it exists
rm -rf planner

# Create the 'planner' directory
mkdir planner

# Copy all files from ../cycling-dinner-planner/web to planner/
cp -R ../cycling-dinner-planner/web/* planner/

