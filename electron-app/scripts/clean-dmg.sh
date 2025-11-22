#!/bin/bash

# Force detach all MCP Figma volumes
echo "Checking for mounted MCP Figma volumes..."

# Find all mounted volumes matching "MCP Figma"
VOLUMES=$(hdiutil info | grep "/Volumes/MCP Figma" | awk '{print $1}' || true)

if [ -z "$VOLUMES" ]; then
    echo "No MCP Figma volumes found."
    exit 0
fi

echo "Found volumes to detach:"
echo "$VOLUMES"

# Try to detach each volume
for DEVICE in $VOLUMES; do
    echo "Attempting to detach $DEVICE..."

    # Try normal detach first
    if hdiutil detach "$DEVICE" -quiet 2>/dev/null; then
        echo "  ✓ Successfully detached $DEVICE"
        continue
    fi

    # If that fails, try force detach
    echo "  Normal detach failed, trying force detach..."
    if hdiutil detach "$DEVICE" -force 2>/dev/null; then
        echo "  ✓ Force detached $DEVICE"
        continue
    fi

    # If force fails too, just warn and continue
    echo "  ⚠ Could not detach $DEVICE (will continue anyway)"
done

echo "DMG cleanup completed."
exit 0
