# Git Ignore Summary - Files Excluded from Version Control

## 📋 Overview
This document lists all files and directories that are excluded from Git version control to keep the repository clean and focused on source code.

## 🔴 Categories of Excluded Files

### 1. **Dependencies** (Auto-generated)
- `node_modules/` - All npm packages
- `package-lock.json` - Lock files (should be generated per environment)

### 2. **Build Outputs** (Generated from source)
- `backend/dist/` - Compiled TypeScript backend
- `frontend/dist/` - Built frontend application
- `frontend/backend-dist/` - Backend copy for frontend
- `dist-installer*/` - All installer builds
- `dist-electron*/` - Electron build artifacts
- `win-unpacked/` - Unpacked Windows builds

### 3. **Database Files** (Runtime data)
- `*.db`, `*.sqlite`, `*.sqlite3` - All database files
- `backend/prisma/dev.db` - Development database
- User should create their own database locally

### 4. **Log Files** (Runtime generated)
- `*.log` - All log files
- `backend/logs/` - Application logs
- `audit.log` - Audit trail logs

### 5. **Temporary Files** (Runtime generated)
- `temp/`, `tmp/` - Temporary directories
- `backend/src/temp/` - PDF temp files
- `*.tmp`, `*.temp` - Temporary file extensions

### 6. **Executables & Binaries** (Built artifacts)
- `*.exe`, `*.dll`, `*.msi` - Windows executables
- `*.dmg`, `*.pkg` - macOS installers
- `*.deb`, `*.rpm` - Linux packages
- `backend/src/daemon/*.exe` - Daemon executables

### 7. **Printer Test Files** (Test artifacts)
- `backend/EPSON*` - Printer test files
- `backend/ESDPRT*` - Test printer files
- `backend/Microsoft Print to PDF` - Test output

### 8. **Font Files** (Except essential ones)
- `*.zip`, `*.ttf`, `*.otf`, `*.woff`, `*.woff2` - All fonts
- `backend/fonts/NotoSansKannada/` - Font directory
- `font-base64.txt` - Base64 encoded fonts
- **EXCEPTION:** Keep these fonts:
  - ✅ `backend/fonts/NotoSansKannada-Regular.ttf`
  - ✅ `backend/fonts/NotoSansKannada-Bold.ttf`

### 9. **Media Files** (Large binary files)
- `*.mp4`, `*.avi`, `*.mov` - Video files
- `*.mp3`, `*.wav`, `*.flac` - Audio files

### 10. **Archive Files** (Compressed)
- `*.zip`, `*.rar`, `*.7z`, `*.tar`, `*.gz` - All archives

### 11. **Runtime Generated Files**
- `ticketId.json` - Ticket ID counter
- `tracked-files.txt` - Tracking file
- `query` - Query artifacts

### 12. **Old/Duplicate Config Files**
- `electron-builder-installer-fixed.json`
- `electron-builder-installer-limitfixed.json`
- `electron-builder-installer-v2.json`
- `electron-builder-seatfix.json`
- `frontend/electron-builder-debug.json`
- `frontend/electron-builder-portable.json`
- `frontend/electron-builder-seatdata-fixed.json`
- `frontend/electron-builder-seatfix.json`

### 13. **Test Files**
- `test-*.js`, `test-*.ts` - Test scripts
- `*.test.js`, `*.spec.ts` - Test files

### 14. **IDE & Editor Files**
- `.vscode/` - VS Code settings
- `.idea/` - IntelliJ IDEA settings
- `*.swp`, `*.swo` - Vim swap files

### 15. **OS Generated Files**
- `.DS_Store` - macOS metadata
- `Thumbs.db` - Windows thumbnails
- `desktop.ini` - Windows folder config

### 16. **Environment & Secrets**
- `.env`, `.env.local` - Environment variables
- All sensitive configuration files

## ✅ What IS Tracked in Git

### Source Code
- All `.ts`, `.tsx`, `.js`, `.jsx`, `.cjs` files in `src/`
- All React components and utilities
- All backend services and APIs

### Configuration Files
- `package.json` - Dependency definitions
- `tsconfig.json` - TypeScript configuration
- `electron-builder-installer.json` - Main installer config
- `electron-builder.json` - Main Electron config
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind configuration

### Documentation
- All `.md` files (README, guides, etc.)
- API documentation
- User manuals

### Essential Assets
- `backend/fonts/NotoSansKannada-Regular.ttf`
- `backend/fonts/NotoSansKannada-Bold.ttf`
- `backend/fonts/README.md`
- Icon files in `resources/`
- Public assets (favicon, etc.)

### Database Schema
- `backend/prisma/schema.prisma` - Database schema
- `backend/prisma/migrations/` - Migration files

## 📊 Repository Size Impact

**Before .gitignore optimization:** ~7+ GB
**After .gitignore optimization:** ~50-100 MB (source code only)

**Files excluded:** 1600+ files (build artifacts, logs, dependencies)

## 🎯 Best Practices

1. **Never commit:**
   - Build outputs (can be regenerated)
   - Dependencies (should be installed via `npm install`)
   - Database files (contain user data)
   - Log files (runtime generated)
   - Secrets/environment files

2. **Always commit:**
   - Source code
   - Configuration files
   - Documentation
   - Database schema (not data)
   - Essential assets

3. **Use `.env.example`:**
   - Commit `.env.example` with placeholder values
   - Never commit actual `.env` files

## 🔄 After Updating .gitignore

Run these commands to clean up already tracked files:

```bash
# Remove all currently tracked files from Git (doesn't delete them)
git rm -r --cached .

# Add all files back (respecting new .gitignore)
git add .

# Commit the cleanup
git commit -m "chore: update .gitignore and remove tracked build artifacts"
```

## 📝 Notes

- The `.gitignore` file is now comprehensive and follows industry best practices
- All unnecessary files are excluded to keep repository clean and fast
- Only source code and essential configuration files are tracked
- Build artifacts can be regenerated from source code
- Database files are created locally per environment

