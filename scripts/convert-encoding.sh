#!/bin/bash
# Convert files to UTF-8 encoding and LF line endings

echo "Converting files to UTF-8 and LF..."

find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \
  -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
  -o -name ".gitignore" -o -name ".vscodeignore" -o -name ".editorconfig" \
  -o -name ".prettierrc" -o -name "package.json" -o -name "tsconfig*.json" \
  -o -name "eslint*" -o -name ".eslintrc*" \) \
  ! -path "./node_modules/*" \
  ! -path "./.git/*" \
  ! -path "./dist/*" \
  ! -path "./.vscode-test/*" \
  ! -path "./out/*" \
  ! -path "./coverage/*" \
  -exec sh -c '
    # Convert CRLF to LF
    sed -i "s/\r$//" "$1"

    # Check if UTF-8, convert if not
    encoding=$(file -i "$1" | cut -d= -f2 | tr -d " \n\r")
    if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
      echo "Converting $1 from $encoding to UTF-8"
      iconv -f "$encoding" -t UTF-8 "$1" > "$1.tmp" 2>/dev/null && mv "$1.tmp" "$1"
    fi
  ' _ {} \;

echo "Conversion complete!"
echo ""
echo "Verification:"
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  ! -path "./node_modules/*" -exec file -i {} \; | grep -v "utf-8\|us-ascii" || echo "All files are UTF-8!"
