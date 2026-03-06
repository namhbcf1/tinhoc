#!/bin/bash
# Copy R2 objects from tinhoc-files to vantrangedu-files
# Uses wrangler r2 object get/put

SOURCE_BUCKET="tinhoc-files"
DEST_BUCKET="vantrangedu-files"
TEMP_DIR="$TEMP/r2_copy_temp"
mkdir -p "$TEMP_DIR"

KEYS_FILE="$TEMP/r2_keys_list.txt"

echo "Starting R2 copy: $SOURCE_BUCKET -> $DEST_BUCKET"
echo "Temp dir: $TEMP_DIR"

total=$(wc -l < "$KEYS_FILE")
copied=0
failed=0

while IFS= read -r key; do
  [ -z "$key" ] && continue

  # Create temp file path (replace / with _)
  safe_name=$(echo "$key" | tr '/' '_')
  temp_file="$TEMP_DIR/$safe_name"

  # Download from source
  echo -n "  [$((copied+failed+1))/$total] $key ... "
  npx wrangler r2 object get "$SOURCE_BUCKET/$key" --file="$temp_file" --remote 2>/dev/null

  if [ $? -eq 0 ] && [ -f "$temp_file" ]; then
    # Upload to destination
    npx wrangler r2 object put "$DEST_BUCKET/$key" --file="$temp_file" --remote 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "OK"
      copied=$((copied + 1))
    else
      echo "FAIL (upload)"
      failed=$((failed + 1))
    fi
    rm -f "$temp_file"
  else
    echo "FAIL (download)"
    failed=$((failed + 1))
  fi
done < "$KEYS_FILE"

echo ""
echo "Done! Copied: $copied, Failed: $failed, Total: $total"
rm -rf "$TEMP_DIR"
