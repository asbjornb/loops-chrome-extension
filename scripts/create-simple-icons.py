#!/usr/bin/env python3
import struct
import zlib
import os

def create_simple_png(size, filename):
    """Create a simple purple square PNG with white 'L' (simplified)"""
    # Create a simple purple square
    width = height = size
    
    # PNG header
    header = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # Create image data (purple background)
    # RGB values for purple: (108, 58, 237)
    scanlines = []
    for y in range(height):
        scanline = b'\x00'  # filter type none
        for x in range(width):
            # Simple purple color
            scanline += bytes([108, 58, 237])
        scanlines.append(scanline)
    
    image_data = b''.join(scanlines)
    compressed = zlib.compress(image_data)
    
    # IDAT chunk
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(header + ihdr_chunk + idat_chunk + iend_chunk)

# Create icons directory if it doesn't exist
icons_dir = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(icons_dir, exist_ok=True)

# Generate icons
sizes = [16, 32, 48, 128]
for size in sizes:
    filename = os.path.join(icons_dir, f'icon{size}.png')
    create_simple_png(size, filename)
    print(f'Created {filename}')

print('All placeholder icons created successfully!')