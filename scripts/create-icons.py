#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create image with gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle with gradient effect (simplified to solid color)
    radius = int(size * 0.15)
    # Using a purple color that's between the gradient colors
    color = (108, 58, 237)  # #6C3AED
    
    # Draw rounded rectangle
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=radius, fill=color)
    
    # Draw "L" text
    try:
        font_size = int(size * 0.6)
        # Try to use a system font, fallback to default if not available
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Use default font if Arial is not available
        font = ImageFont.load_default()
    
    text = "L"
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill='white', font=font)
    
    return img

# Create icons directory if it doesn't exist
icons_dir = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(icons_dir, exist_ok=True)

# Generate icons
sizes = [16, 32, 48, 128]
for size in sizes:
    img = create_icon(size)
    filename = os.path.join(icons_dir, f'icon{size}.png')
    img.save(filename, 'PNG')
    print(f'Created {filename}')

print('All icons created successfully!')