#!/usr/bin/env python3
"""Prepend release notes to README.md.

Replaces the existing release notes section if present.
Touches nothing else in the file.

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

SECTION_START = "<!-- release-notes-start -->"
SECTION_END   = "<!-- release-notes-end -->"

new_section = (
    f"{SECTION_START}\n"
    f"## What's New in v{version}\n\n"
    f"{notes}\n\n"
    f"{SECTION_END}\n"
)

if SECTION_START in content:
    # Replace existing section
    content = re.sub(
        re.escape(SECTION_START) + r".*?" + re.escape(SECTION_END) + r"\n?",
        new_section,
        content,
        flags=re.DOTALL,
    )
else:
    # No previous section — prepend before the first line
    content = new_section + "\n" + content

readme_path.write_text(content)
print(f"README.md updated for v{version}")
