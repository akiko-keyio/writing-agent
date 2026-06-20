#!/usr/bin/env python3
"""CLI for reference quality checks on a markdown document.

Default: online CrossRef + URL checks. Use --offline for local-only checks.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from reference_check import check_document, urllib_fetcher


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check external references in a document.")
    parser.add_argument("document", type=Path, help="Markdown file to scan")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=None,
        help="Project root containing references/ (default: parent of document)",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Skip network checks (local references + claim overlap only)",
    )
    parser.add_argument(
        "--mailto",
        default="writing-agent@example.com",
        help="Contact email for CrossRef polite pool User-Agent",
    )
    parser.add_argument("--json", action="store_true", dest="as_json", help="Emit JSON report")
    args = parser.parse_args(argv)

    doc = args.document.resolve()
    if not doc.is_file():
        print(f"Not a file: {doc}", file=sys.stderr)
        return 2

    root = args.project_root.resolve() if args.project_root else doc.parent
    fetcher = None if args.offline else urllib_fetcher()
    report = check_document(
        doc,
        project_root=root,
        fetcher=fetcher,
        online=not args.offline,
        mailto=args.mailto,
    )

    if args.as_json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(f"Reference check: {report.path}")
        if report.ok:
            print("OK — no issues found.")
        else:
            for finding in report.findings:
                line = f"[{finding.kind}] {finding.message}"
                if finding.detail:
                    line += f" — {finding.detail}"
                print(line)

    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
