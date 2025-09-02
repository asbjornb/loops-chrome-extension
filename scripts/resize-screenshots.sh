#!/bin/bash

# Resize screenshots for Chrome Web Store submission
# Requirements: 1280x800 or 640x400, JPEG or PNG (no alpha)

SCREENSHOTS_DIR="../dist/screenshots"
OUTPUT_DIR="../dist/screenshots/webstore"
TARGET_SIZE="1280x800"

echo "🖼️  Resizing screenshots for Chrome Web Store"
echo "📏 Target size: ${TARGET_SIZE}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if ImageMagick is available
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install ImageMagick:"
    echo "   Ubuntu/WSL: sudo apt install imagemagick"
    echo "   macOS: brew install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/script/download.php#windows"
    exit 1
fi

processed=0

# Process each PNG file
for file in "$SCREENSHOTS_DIR"/*.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .png)
        output_file="$OUTPUT_DIR/${filename}_webstore.png"
        
        echo "Processing: $filename.png"
        
        # Get current dimensions
        current_size=$(identify -format "%wx%h" "$file" 2>/dev/null)
        echo "  Current: $current_size"
        
        # Resize with smart cropping to maintain aspect ratio
        # -resize fits within bounds, -gravity center crops from center, -extent ensures exact size
        convert "$file" \
            -resize "${TARGET_SIZE}^" \
            -gravity center \
            -extent "$TARGET_SIZE" \
            -background white \
            -alpha remove \
            -quality 95 \
            "$output_file"
            
        if [ $? -eq 0 ]; then
            echo "  ✅ Saved: ${TARGET_SIZE} -> ${output_file}"
            ((processed++))
        else
            echo "  ❌ Error processing $file"
        fi
    fi
done

echo ""
echo "✅ Processed $processed screenshots"
echo "📁 Output directory: $OUTPUT_DIR"
echo "📏 All images resized to $TARGET_SIZE"
echo ""
echo "Ready for Chrome Web Store upload! 🚀"