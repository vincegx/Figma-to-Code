# MCP Figma to Code - Desktop Application

Transform Figma designs into pixel-perfect React + Tailwind components with a native desktop app.

## Installation

### Option 1: Download Pre-built App (Recommended)

Download the latest installer for your platform:
- **macOS**: `MCP-Figma-to-Code-{version}.dmg`
- **Windows**: `MCP-Figma-to-Code-Setup-{version}.exe`
- **Linux**: `MCP-Figma-to-Code-{version}.AppImage`

### Option 2: Build from Source

```bash
# Clone repository
git clone https://github.com/your-org/mcp-figma-v1.git
cd mcp-figma-v1

# Install root dependencies
npm install

# Build desktop app
cd electron-app
npm install
./build.sh
```

Installers will be in `electron-app/dist-electron/`

## Quick Start

### Prerequisites

1. **Figma Desktop** must be installed and running
2. **MCP Server** enabled in Figma Desktop (port 3845)

### Launch Development Mode

```bash
cd electron-app
./dev.sh
```

The app will open automatically and connect to Figma Desktop.

### Your First Analysis

1. Open a Figma design in Figma Desktop
2. In the desktop app, go to **Analyze** page
3. Copy the Figma URL and paste it
4. Click **Analyze**
5. Watch real-time logs as the component is generated
6. View results in the **Dashboard**

## Features

### Native Desktop Experience

- 📱 **Standalone App**: No Docker required
- 🚀 **Faster MCP Connection**: Direct localhost (not via Docker bridge)
- 💻 **Multi-Platform**: Works on macOS, Windows, and Linux
- 🔄 **Auto-Updates**: Get latest features automatically (coming soon)

### All Web Features Included

- ✅ 4-Phase transformation pipeline
- ✅ 14 AST transformations
- ✅ Visual validation with Puppeteer
- ✅ Responsive merge (Desktop/Tablet/Mobile)
- ✅ Dark/Light mode
- ✅ i18n support (English/French)
- ✅ Real-time analysis logs

## Usage

### Menu Shortcuts

- `Cmd/Ctrl + N`: New analysis
- `Cmd/Ctrl + R`: Reload dashboard
- `Cmd/Ctrl + Q`: Quit application
- `Cmd/Ctrl + Shift + I`: Toggle DevTools

### Configuration

Settings are shared with Docker mode and located at:
```
../cli/config/settings.json
```

Changes apply to both desktop and web versions.

### Output Directory

Generated components are saved to:
```
../src/generated/export_figma/node-{id}-{timestamp}/
```

Same structure as Docker mode.

## Differences from Web Version

| Feature | Web (Docker) | Desktop (Electron) |
|---------|-------------|-------------------|
| Installation | Requires Docker | Native installer |
| MCP Connection | `host.docker.internal` | `localhost` (faster) |
| Chromium | System package | Bundled |
| Updates | Manual `docker pull` | Auto-update (future) |
| Platform | Any with Docker | macOS/Windows/Linux |

## Troubleshooting

### App won't start

**Error**: "Cannot find module..."
- Solution: Ensure parent `node_modules` exists
  ```bash
  cd ..
  npm install
  ```

### MCP connection fails

**Error**: "Failed to connect to MCP server"
- Check: Is Figma Desktop running?
- Check: Is MCP enabled? (Figma → Preferences → MCP)
- Test: `curl http://localhost:3845/mcp`

### Analysis hangs or fails

**Error**: "Screenshot capture timeout"
- Solution: Increase timeout in settings.json
- Check: Sufficient RAM available (4GB+ recommended)

### White screen on launch

**Error**: Blank window
- Solution: Clear app data
  - macOS: `~/Library/Application Support/MCP Figma to Code`
  - Windows: `%APPDATA%\MCP Figma to Code`
  - Linux: `~/.config/MCP Figma to Code`

### Build fails

**Error**: "Cannot build for platform X"
- macOS: Requires Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- Windows: Requires Windows SDK or Visual Studio Build Tools
- Linux: Requires build-essential
  ```bash
  sudo apt install build-essential
  ```

## Development

### Project Structure

```
electron-app/
├── main.js              # Electron main process
├── preload.js           # Secure bridge
├── package.json         # Desktop dependencies
├── electron-builder.yml # Packaging config
└── dev.sh / build.sh    # Launcher scripts
```

### Running in Dev Mode

```bash
./dev.sh
```

This:
1. Sets `ELECTRON_MODE=true`
2. Starts Vite dev server
3. Launches Electron with DevTools

### Building for Distribution

```bash
# Current platform only
./build.sh

# All platforms (requires setup)
npm run build:all
```

### Testing Changes

After modifying shared code (`../src`, `../scripts`):
1. Changes auto-reload via Vite HMR
2. For Electron code changes, restart app

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Testing requirements

For Electron-specific changes:
- Test on all target platforms
- Ensure Docker mode still works
- Update this README if needed

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/mcp-figma-v1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mcp-figma-v1/discussions)
- **Documentation**: [Full Docs](../docs/)

## License

MIT License - see [LICENSE](../LICENSE) for details

## Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Puppeteer](https://pptr.dev/)
- [MCP SDK](https://github.com/modelcontextprotocol)
