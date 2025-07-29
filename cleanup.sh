#!/bin/bash
find . -type f -name "*.jsx" | while read -r jsx_file; do
    tsx_file="${jsx_file%.jsx}.tsx"
    if [ -f "$tsx_file" ]; then
        echo "Deleting $jsx_file (duplicate of $tsx_file)"
        rm "$jsx_file"
    fi
done
