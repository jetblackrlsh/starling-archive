# Starling Archive 0.2.0

This release adds live Huntsville context and one-button desktop updates to both macOS and Windows.

## New

- Persistent Huntsville, Alabama clock in `HH:MM AM/PM MM/DD/YYYY` format
- Current Huntsville temperature in Fahrenheit and plain-language sky conditions
- Manual weather refresh with cached fallback during temporary network interruptions
- A Settings button that downloads the matching release, verifies its SHA-256 digest, installs it, and restarts Starling Archive
- Architecture-aware Apple Silicon and Intel Mac update selection
- Windows NSIS installer selection and silent update handoff

## Distribution

The GitHub release includes unsigned macOS DMG/ZIP downloads for Apple Silicon and Intel plus unsigned Windows installer/portable executables. macOS and Windows may display the usual warnings for unsigned applications.
