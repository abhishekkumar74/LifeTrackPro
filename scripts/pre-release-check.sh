#!/bin/bash
# pre-release-check.sh
# Exit immediately if a command exits with a non-zero status.
set -e

echo "=== Running Pre-Release Check ==="

# 1. TypeScript Validation
echo "1. Checking TypeScript compilation..."
npx tsc --noEmit
echo "✅ TypeScript check passed!"

# 2. Auditing sound assets size
echo "2. Auditing sound assets size..."
MAX_SIZE=1572864 # 1.5MB in bytes
LARGE_FILES=0
for f in assets/sounds/*.mp3; do
  if [ -f "$f" ]; then
    size=$(wc -c < "$f" | tr -d ' ')
    if [ "$size" -gt "$MAX_SIZE" ]; then
      size_mb=$(echo "scale=2; $size / 1048576" | bc 2>/dev/null || awk "BEGIN {print $size/1048576}")
      echo "⚠️ WARNING: $f is too large: ${size_mb}MB (Target: < 1.5MB)"
      LARGE_FILES=$((LARGE_FILES + 1))
    fi
  fi
done

if [ "$LARGE_FILES" -gt 0 ]; then
  echo "⚠️ Some MP3 files exceed 1.5MB. Ensure you compress them manually before building."
else
  echo "✅ All MP3 files are under 1.5MB."
fi

# 3. Environment Variables sanity check
echo "3. Verifying .env keys..."
if [ ! -f .env ]; then
  echo "❌ Error: .env file is missing."
  exit 1
fi

missing_env=0
for var in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_SENTRY_DSN; do
  if ! grep -q "^$var=" .env; then
    echo "❌ Error: Missing $var in .env"
    missing_env=1
  fi
done

if [ "$missing_env" -eq 1 ]; then
  exit 1
fi
echo "✅ Environment variables verified!"

echo "🎉 Pre-release checks passed successfully!"
