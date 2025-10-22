# Kannada Fonts for Enterprise Use

## Font Installation Instructions

To ensure proper Kannada text rendering in production, install the following fonts:

### 1. Akshar Unicode Font
- **Download**: https://salrc.uchicago.edu/resources/fonts/available/kannada/
- **Installation**: 
  1. Download the TTF file
  2. Right-click and select "Install" 
  3. Or copy to `C:\Windows\Fonts\`

### 2. Alternative Fonts
- **Tunga**: Available on Windows XP+ (requires Supplemental Language Support)
- **Kedage**: Commercial font, may need separate installation

## Enterprise Deployment

For enterprise deployment, include these fonts in your installer:

1. Bundle the font files with your application
2. Install fonts automatically during setup
3. Verify font availability before PDF generation

## Testing

Test Kannada rendering by:
1. Opening Notepad
2. Selecting the installed Kannada font
3. Typing: ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ
4. Verify proper rendering

## Fallback Strategy

If Kannada fonts are not available, the system will:
1. Try system fonts in order of preference
2. Fall back to English text if no Kannada fonts found
3. Log font availability status for debugging
