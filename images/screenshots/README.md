# Screenshot Specifications

## File Requirements

- **Format**: PNG (lossless)
- **Screenshots**: 1280x800 pixels
- **Banner**: 1280x640 pixels
- **File size**: Under 500KB each

## Visual Guidelines

1. **Theme**: VS Code Dark+ (default dark theme)
2. **Font**: Consolas or Monaco, 14px
3. **Zoom**: 125% for better readability
4. **Accent Color**: #ff6b6b (coral red) for highlights

## Annotation Style

- Use orange/red circles to highlight cursor position
- Add arrows pointing to key UI elements
- Keep annotations minimal and consistent
- Use 2px stroke width for circles

## Naming Convention

- `copy-function.png`: Function extraction feature
- `copy-to-file.png`: File picker dialog
- `context-menu.png`: Full context menu
- `enum-generator.png`: Enum generation
- `terminal-integration.png`: Terminal opening

## Quick Reference

### Before Capturing

1. Set VS Code to Dark Theme (Default Dark+)
2. Increase editor zoom to 125%
3. Hide minimap (View > Appearance > Minimap > Hide)
4. Disable word wrap (View > Word Wrap > Off)
5. Set font size to 14px

### Capture Tools

- **macOS**: Cmd+Shift+4 (built-in)
- **Windows**: Win+Shift+S (Snipping Tool)
- **Linux**: gnome-screenshot or Spectacle
- **Cross-platform**: ShareX, Flameshot

### Post-Processing

- Crop to exact dimensions
- Add highlights with #ff6b6b
- Optimize PNG: `pngquant --quality=80-95 input.png`
- Keep file size under 500KB
