# MCP Figma to Code - Desktop Mode

This directory contains the Electron desktop application wrapper for MCP Figma to Code.

## Quick Start

### Development

```bash
cd electron-app
./dev.sh
```

This will:
1. Start Vite dev server on port 5173 (from parent directory)
2. Launch Electron window pointing to the dev server
3. Start Express API server with `ELECTRON_MODE=true`

### Production Build

```bash
cd electron-app
./build.sh
```

Generates platform-specific installers in `dist-electron/`:
- **macOS**: `.dmg` and `.zip` (arm64 + x64)
- **Windows**: `.exe` (NSIS installer) and portable
- **Linux**: `.AppImage` and `.deb`

### Build for Specific Platforms

```bash
npm run build:mac      # macOS only
npm run build:win      # Windows only
npm run build:linux    # Linux only
npm run build:all      # All platforms
```

## Architecture

### File Structure

```
electron-app/
├── package.json           # Electron-specific dependencies
├── main.js               # Main process (creates window, starts server)
├── preload.js            # Preload script (secure bridge)
├── electron-builder.yml  # Build configuration
├── dev.sh               # Development launcher
├── build.sh             # Production build script
└── CLAUDE.md            # This file
```

### Process Architecture

```
┌─────────────────────────────────┐
│   Main Process (main.js)        │
│   - Creates BrowserWindow        │
│   - Spawns server.js             │
│   - Handles app lifecycle        │
└──────────┬──────────────────────┘
           │
           ├─> Express Server (../server.js)
           │   - ELECTRON_MODE=true
           │   - Listens on 127.0.0.1:5173
           │   - Runs analysis scripts
           │
           └─> Renderer Process (BrowserWindow)
               - Loads http://localhost:5173 (dev)
               - Or file://.../dist/index.html (prod)
               - React dashboard UI
```

## Key Differences from Docker Mode

### Environment Variables

| Variable | Docker | Desktop (Electron) |
|----------|--------|-------------------|
| `ELECTRON_MODE` | - | `true` |
| `HOST` (server.js) | `0.0.0.0` | `127.0.0.1` |
| MCP URL | `host.docker.internal:3845` | `localhost:3845` |
| Chromium path | `/usr/bin/chromium` | Auto-detected |

### Dependencies

- **Docker**: Uses root `package.json` (540 packages)
- **Desktop**: Uses `electron-app/package.json` (~50 packages)
- **Isolation**: Completely separate `node_modules/`

### MCP Connection

- **Docker**: Via `host.docker.internal` bridge
- **Desktop**: Direct `localhost` connection (faster)

## Development Notes

### Hot Reload

In dev mode:
- Vite HMR works normally for frontend
- Changes to `main.js` or `preload.js` require restart
- Server changes require full restart

### Debugging

Open DevTools:
- Automatically opens in dev mode
- Or use menu: View → Toggle Developer Tools

Console logs:
- Renderer logs: In DevTools Console
- Main process logs: In terminal where you ran `./dev.sh`

## Building

### Prerequisites

- Node.js 20+ installed locally
- For macOS builds: Xcode Command Line Tools
- For Windows builds: Windows SDK (on Windows) or Wine (cross-platform)
- For Linux builds: Standard build tools (`build-essential`)

### First Build

```bash
cd electron-app
npm install  # Install Electron + builder
./build.sh   # Build for current platform
```

### Cross-Platform Builds

From macOS, you can build:
- ✅ macOS (arm64 + x64)
- ✅ Windows (via wine)
- ✅ Linux (via Docker)

From Windows, you can build:
- ✅ Windows
- ❌ macOS (requires macOS)
- ✅ Linux (via WSL/Docker)

From Linux, you can build:
- ✅ Linux
- ❌ macOS (requires macOS)
- ⚠️ Windows (requires Wine)

## Configuration

### electron-builder.yml

Main configuration file for packaging:
- App ID, name, copyright
- Files to include/exclude
- Platform-specific settings
- Installer options

### package.json Scripts

- `dev`: Development mode (Vite + Electron)
- `vite:dev`: Start Vite dev server only
- `build`: Build for current platform
- `build:all`: Build for all platforms
- `build:mac/win/linux`: Platform-specific builds

## Troubleshooting

### "ELECTRON_MODE not set" errors

Ensure you're using `./dev.sh` or `./build.sh` scripts, not raw `npm` commands. These scripts set required environment variables.

### MCP connection fails

1. Verify Figma Desktop is running
2. Check MCP server: `curl http://localhost:3845/mcp`
3. Ensure no firewall blocking port 3845

### Chromium not found (Puppeteer)

In Electron mode, Puppeteer should auto-detect Chromium. If it fails:
```bash
# Install Chromium explicitly
npm install puppeteer --no-save
```

### Build fails with signing errors (macOS)

For development builds, disable code signing:
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
./build.sh
```

For production, configure proper code signing certificates.

### "Cannot find module" errors

Ensure parent directory has dependencies:
```bash
cd ..
npm install
cd electron-app
```

## Sharing Code with Docker Mode

The desktop app **shares** these directories with Docker mode:
- `../src/` - React components, hooks, pages
- `../scripts/` - AST transformations, post-processing
- `../cli/` - Configuration, settings
- `../server.js` - Express API server

Changes to shared code affect **both** modes.

Only Electron-specific files are in `electron-app/`:
- Electron wrapper (main.js, preload.js)
- Desktop-only dependencies
- Build configuration
- Launch scripts

## Production Deployment

### Distribution

After building:
1. Test the installer on target platform
2. Distribute via:
   - Direct download (GitHub Releases)
   - Update server (electron-updater)
   - App stores (Mac App Store, Microsoft Store, Snap Store)

### Auto-Updates

To enable auto-updates:
1. Configure `publish` in `electron-builder.yml`
2. Set up update server or GitHub Releases
3. Implement update checks in `main.js`

### Code Signing

For production releases:
- **macOS**: Apple Developer ID certificate
- **Windows**: Code signing certificate (EV recommended)
- **Linux**: GPG signing (optional)

## Contributing

When modifying Electron integration:
1. Test in **both** dev and production modes
2. Verify Docker mode still works (`docker-compose up`)
3. Update this CLAUDE.md if behavior changes
4. Test on all target platforms before release

## Resources

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [electron-builder Docs](https://www.electron.build/)
- [Main Project README](../README.md)
- [Full Architecture](../docs/ARCHITECTURE.md)
