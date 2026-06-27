#!/usr/bin/env python3
"""Update README.md for a new Sonar release.

Usage: python3 update-readme.py <version> <notes-file>
"""
import re
import sys
from pathlib import Path

version = sys.argv[1]
notes_path = sys.argv[2]
notes = Path(notes_path).read_text().strip()
readme_path = Path("README.md")
content = readme_path.read_text()

# ── 1. Remove previous "What's New" section ──────────────────────────────────
content = re.sub(
    r"\n## What's New in v[\d.]+\n.*?(?=\n## |\Z)",
    "",
    content,
    flags=re.DOTALL,
)
# Clean up excess blank lines left behind
content = re.sub(r"\n{3,}", "\n\n", content)

# ── 2. Insert new "What's New" section after the first --- ───────────────────
whats_new = (
    f"\n## What's New in v{version}\n\n"
    f"{notes}\n\n"
    f"---"
)
# Find the first horizontal rule and insert after it
first_hr = re.search(r"\n---\n", content)
if first_hr:
    insert_at = first_hr.end()
    content = content[: insert_at] + whats_new + "\n" + content[insert_at :]
else:
    content = content + "\n" + whats_new + "\n"

# ── 3. Update Windows download row ───────────────────────────────────────────
base = f"https://github.com/thecatthatflies/sonar/releases/download/v{version}"
win_row = (
    f"| Windows | x86_64 | "
    f"[Sonar-{version}-setup.exe]({base}/Sonar-{version}-setup.exe) "
    f"and [Sonar-{version}.msi]({base}/Sonar-{version}.msi) |"
)
# Replace the Windows row (matches "Coming soon" or a previous link)
content = re.sub(
    r"\| Windows \|.*?\|.*?\|",
    win_row,
    content,
)

# ── 4. Add Windows Quick Start section (idempotent) ──────────────────────────
if "### Windows" not in content:
    windows_section = (
        "\n### Windows\n\n"
        "1. Download `Sonar-{v}-setup.exe`\n"
        "2. Run the installer\n"
        "3. Launch Sonar from the Start Menu or Desktop\n"
    ).format(v=version)

    # Insert after the Linux Quick Start block
    content = re.sub(
        r"(### Linux\n.*?)(---)",
        lambda m: m.group(1) + windows_section + "\n---",
        content,
        flags=re.DOTALL,
        count=1,
    )

# ── 5. Update macOS download links to reflect new version ────────────────────
mac_base = f"https://github.com/thecatthatflies/sonar/releases/download/v{version}"
content = re.sub(
    r"\| macOS \| Apple Silicon \|.*?\|",
    f"| macOS | Apple Silicon | [Sonar-{version}.dmg]({mac_base}/Sonar-{version}.dmg) |",
    content,
)

readme_path.write_text(content)
print(f"README.md updated for v{version}")
