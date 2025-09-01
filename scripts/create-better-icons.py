#!/usr/bin/env python3
"""
Create better icons for Loops Chrome Extension
- Purple gradient background
- Loop/infinity symbol design
- Clean, modern look
"""

def create_svg_icon():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5" />
      <stop offset="100%" style="stop-color:#7C3AED" />
    </linearGradient>
    <linearGradient id="loop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF" />
      <stop offset="100%" style="stop-color:#E0E7FF" />
    </linearGradient>
  </defs>
  
  <!-- Rounded square background -->
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  
  <!-- Loop/infinity symbol with modern twist -->
  <g transform="translate(64, 64)">
    <!-- Main loop shape -->
    <path d="M -28 -8 C -35 -15, -45 -15, -45 0 C -45 15, -35 15, -28 8 C -21 1, -7 1, 0 8 C 7 15, 21 15, 28 8 C 35 1, 45 1, 45 0 C 45 -15, 35 -15, 28 -8 C 21 -1, 7 -1, 0 -8 C -7 -15, -21 -15, -28 -8 Z" 
          fill="url(#loop)" 
          stroke="rgba(255,255,255,0.3)" 
          stroke-width="1"/>
    
    <!-- Center connection dot -->
    <circle cx="0" cy="0" r="3" fill="rgba(255,255,255,0.8)"/>
    
    <!-- Small accent dots for dynamic feel -->
    <circle cx="-22" cy="0" r="2" fill="rgba(255,255,255,0.6)"/>
    <circle cx="22" cy="0" r="2" fill="rgba(255,255,255,0.6)"/>
  </g>
</svg>'''

def create_simple_png(size, svg_content):
    """Create a simple colored PNG since we don't have complex SVG rendering"""
    import struct
    import zlib
    
    width = height = size
    
    # Create a gradient-ish effect with the purple colors
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            # Create rounded rectangle mask
            corner_radius = size // 5
            in_corner = False
            
            # Check if we're in a corner that should be rounded
            if (x < corner_radius and y < corner_radius):
                # Top-left corner
                if (x - corner_radius)**2 + (y - corner_radius)**2 > corner_radius**2:
                    in_corner = True
            elif (x >= width - corner_radius and y < corner_radius):
                # Top-right corner  
                if (x - (width - corner_radius))**2 + (y - corner_radius)**2 > corner_radius**2:
                    in_corner = True
            elif (x < corner_radius and y >= height - corner_radius):
                # Bottom-left corner
                if (x - corner_radius)**2 + (y - (height - corner_radius))**2 > corner_radius**2:
                    in_corner = True
            elif (x >= width - corner_radius and y >= height - corner_radius):
                # Bottom-right corner
                if (x - (width - corner_radius))**2 + (y - (height - corner_radius))**2 > corner_radius**2:
                    in_corner = True
            
            if in_corner:
                # Transparent
                row.extend([0, 0, 0, 0])
            else:
                # Gradient from #4F46E5 to #7C3AED
                progress = y / height
                r = int(79 + (124 - 79) * progress)  # 4F to 7C
                g = int(70 + (58 - 70) * progress)   # 46 to 3A  
                b = int(229 + (237 - 229) * progress) # E5 to ED
                
                # Add loop symbol in center
                center_x, center_y = width // 2, height // 2
                dist_from_center = ((x - center_x)**2 + (y - center_y)**2) ** 0.5
                
                # Simple loop representation
                if size > 32:  # Only for larger icons
                    loop_thickness = max(2, size // 20)
                    loop_radius = size // 4
                    
                    # Create infinity-like shape
                    left_center_x = center_x - loop_radius // 2
                    right_center_x = center_x + loop_radius // 2
                    
                    left_dist = ((x - left_center_x)**2 + (y - center_y)**2) ** 0.5
                    right_dist = ((x - right_center_x)**2 + (y - center_y)**2) ** 0.5
                    
                    if (abs(left_dist - loop_radius // 2) < loop_thickness or 
                        abs(right_dist - loop_radius // 2) < loop_thickness):
                        # White loop
                        row.extend([255, 255, 255, 255])
                    else:
                        row.extend([r, g, b, 255])
                else:
                    # For small icons, just add a white "L"
                    if size >= 16:
                        # Simple L shape for small sizes
                        l_thickness = max(1, size // 12)
                        if ((x >= center_x - l_thickness and x <= center_x + l_thickness and 
                             y >= center_y - size//4 and y <= center_y + size//4) or
                            (x >= center_x - l_thickness and x <= center_x + size//4 and
                             y >= center_y + size//4 - l_thickness and y <= center_y + size//4 + l_thickness)):
                            row.extend([255, 255, 255, 255])
                        else:
                            row.extend([r, g, b, 255])
                    else:
                        row.extend([r, g, b, 255])
        pixels.append(row)
    
    # Create PNG
    def png_pack(png_tag, data):
        chunk_head = png_tag + data
        return struct.pack("!I", len(data)) + chunk_head + struct.pack("!I", 0xFFFFFFFF & zlib.crc32(chunk_head))
    
    png_bytes = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    png_bytes += png_pack(b'IHDR', struct.pack("!2I5B", width, height, 8, 6, 0, 0, 0))
    
    # IDAT
    raw_data = b''.join(b'\x00' + bytes(row) for row in pixels)
    png_bytes += png_pack(b'IDAT', zlib.compress(raw_data))
    
    # IEND
    png_bytes += png_pack(b'IEND', b'')
    
    return png_bytes

def main():
    import os
    
    # Create icons directory if it doesn't exist
    icons_dir = os.path.join(os.path.dirname(__file__), '..', 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    # Save SVG version
    svg_content = create_svg_icon()
    with open(os.path.join(icons_dir, 'icon.svg'), 'w') as f:
        f.write(svg_content)
    print('Created icon.svg')
    
    # Generate PNG icons
    sizes = [16, 32, 48, 128]
    for size in sizes:
        png_data = create_simple_png(size, svg_content)
        filename = os.path.join(icons_dir, f'icon{size}.png')
        with open(filename, 'wb') as f:
            f.write(png_data)
        print(f'Created icon{size}.png')
    
    print('All icons created successfully!')

if __name__ == '__main__':
    main()