#!/bin/bash

# Fix router.push() calls by replacing with routerPush() and routerNavigate()
# This script processes all TypeScript/TSX files in app/, components/, and src/

# Files that already have the import
SKIP_FILES=(
  "utils/safeRouter.ts"
  "services/navigationService.ts"
  "types/navigation.types.ts"
)

# Get list of files with router.push
FILES=$(npx grep -rl "router\.push" --include="*.tsx" --include="*.ts" app/ components/ src/ 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v "__tests__" | grep -v ".claude")

for file in $FILES; do
  # Check if file should be skipped
  skip=0
  for skip_file in "${SKIP_FILES[@]}"; do
    if [[ "$file" == *"$skip_file"* ]]; then
      skip=1
      break
    fi
  done
  
  if [ $skip -eq 1 ]; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Add import if not already present
  if ! grep -q "from '@/utils/safeRouter'" "$file"; then
    # Find the last import line and add after it
    last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
    if [ -n "$last_import_line" ]; then
      sed -i "${last_import_line}a import { routerPush, routerNavigate } from '@/utils/safeRouter';" "$file"
    fi
  fi
  
  # Replace router.push with template literals to routerPush
  sed -i 's/router\.push(`\([^`]*\)`)/routerPush(`\1`)/g' "$file"
  
  # Replace router.push with string literal to routerPush  
  sed -i "s/router\.push('\([^']*\)')/routerPush('\1')/g" "$file"
  sed -i 's/router\.push("\([^"]*\)")/routerPush("\1")/g' "$file"
  
  # Replace router.push with object to routerNavigate
  sed -i 's/router\.push({ pathname: \([^,]*\), params: \([^}]*\) })/routerNavigate({ pathname: \1, params: \2 })/g' "$file"
  
  # Remove the "as any as string" casts since they're no longer needed
  sed -i 's/ as any as string//g' "$file"
  sed -i 's/ as any//g' "$file"
  
  echo "  Done: $file"
done

echo "All files processed!"
