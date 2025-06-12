#!/bin/bash

# AINodes wrapper script
# Usage: ./ainotes.sh /path/to/notes command [options]

if [ $# -lt 2 ]; then
    echo "Usage: $0 <notes-directory> <command> [options]"
    echo "Example: $0 ~/Documents/notes overview"
    echo "Example: $0 ~/Documents/notes search 'machine learning'"
    exit 1
fi

NOTES_DIR="$1"
shift  # Remove first argument, rest are passed to the command

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate virtual environment
source "$SCRIPT_DIR/ainotes/venv/bin/activate"

# Run the command
cd "$SCRIPT_DIR"
PYTHONPATH=. python -m ainotes.cli.main --notes-root "$NOTES_DIR" "$@"