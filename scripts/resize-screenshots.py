#!/usr/bin/env python3
"""
Resize screenshots for Chrome Web Store submission
Requirements: 1280x800 or 640x400, JPEG or PNG (no alpha)
"""

import os
import sys
from PIL import Image

def resize_image(input_path, output_path, target_size=(1280, 800)):
    """
    Resize image to target dimensions with smart cropping/padding
    """
    print(f"Processing: {os.path.basename(input_path)}")
    
    with Image.open(input_path) as img:
        # Convert RGBA to RGB if needed (remove alpha channel)
        if img.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])  # Use alpha channel as mask
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        original_size = img.size
        print(f"  Original: {original_size[0]}x{original_size[1]}")
        
        # Calculate aspect ratios
        original_ratio = original_size[0] / original_size[1]
        target_ratio = target_size[0] / target_size[1]
        
        if abs(original_ratio - target_ratio) < 0.01:
            # Aspect ratios are very close, just resize
            img = img.resize(target_size, Image.Resampling.LANCZOS)
        elif original_ratio > target_ratio:
            # Image is wider than target, crop width
            new_width = int(original_size[1] * target_ratio)
            left = (original_size[0] - new_width) // 2
            img = img.crop((left, 0, left + new_width, original_size[1]))
            img = img.resize(target_size, Image.Resampling.LANCZOS)
            print(f"  Cropped width: {new_width}px from center")
        else:
            # Image is taller than target, crop height  
            new_height = int(original_size[0] / target_ratio)
            top = (original_size[1] - new_height) // 2
            img = img.crop((0, top, original_size[0], top + new_height))
            img = img.resize(target_size, Image.Resampling.LANCZOS)
            print(f"  Cropped height: {new_height}px from center")
        
        # Save as PNG (Chrome Web Store accepts PNG)
        img.save(output_path, 'PNG', optimize=True)
        print(f"  Saved: {target_size[0]}x{target_size[1]} -> {output_path}")

def main():
    script_dir = os.path.dirname(__file__)
    screenshots_dir = os.path.join(script_dir, '..', 'dist', 'screenshots')
    output_dir = os.path.join(screenshots_dir, 'webstore')
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Target size (Chrome Web Store standard)
    target_size = (1280, 800)
    
    # Process all PNG files
    processed = 0
    for filename in sorted(os.listdir(screenshots_dir)):
        if filename.lower().endswith('.png') and not filename.startswith('.'):
            input_path = os.path.join(screenshots_dir, filename)
            
            # Skip if it's a directory
            if os.path.isdir(input_path):
                continue
                
            # Create output filename
            name_without_ext = os.path.splitext(filename)[0]
            output_filename = f"{name_without_ext}_webstore.png"
            output_path = os.path.join(output_dir, output_filename)
            
            try:
                resize_image(input_path, output_path, target_size)
                processed += 1
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    print(f"\n✅ Processed {processed} screenshots")
    print(f"📁 Output directory: {output_dir}")
    print(f"📏 All images resized to {target_size[0]}x{target_size[1]}")
    print("\nReady for Chrome Web Store upload! 🚀")

if __name__ == '__main__':
    main()