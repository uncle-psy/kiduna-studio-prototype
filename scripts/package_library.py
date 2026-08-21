#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
DOWNLOADS = PUBLIC / "downloads"
PACKAGES = ROOT / "packages"
GENERATED = ROOT / "generated"
STAGING = ROOT / "staging" / "extracted"
VERSION = "3.0.0"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def add_tree(entries: dict[str, Path], source: Path, prefix: str, predicate=lambda _: True):
    if not source.exists():
        return
    for path in source.rglob("*"):
        if path.is_file() and predicate(path):
            entries[f"{prefix}/{path.relative_to(source).as_posix()}"] = path


def add_file(entries: dict[str, Path], source: Path, archive_path: str):
    if source.exists():
        entries[archive_path] = source


def write_zip(filename: str, title: str, entries: dict[str, Path], notes: list[str]):
    destination = PACKAGES / filename
    manifest = {
        "name": title,
        "version": VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "sourcePrecedence": [
            "Original cards and official Changing Vegas rulebook",
            "Final quiet-enamel Power Art and World Art",
            "Verified Core structured data",
            "Existing site presentation only",
            "Reference Art only after independent verification",
        ],
        "notes": notes,
        "fileCount": len(entries),
        "files": [{"path": name, "bytes": path.stat().st_size, "sha256": sha256(path)} for name, path in sorted(entries.items())],
    }
    checksums = "\n".join(f'{item["sha256"]}  {item["path"]}' for item in manifest["files"]) + "\n"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1, allowZip64=True) as archive:
        for name, path in sorted(entries.items()):
            archive.write(path, name)
        archive.writestr("MANIFEST.json", json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        archive.writestr("CHECKSUMS.sha256", checksums)
    return {"filename": filename, "bytes": destination.stat().st_size, "sha256": sha256(destination), "fileCount": len(entries) + 2}


def category_records(categories: set[str], destination_name: str) -> Path:
    records = json.loads((GENERATED / "data" / "card-catalog.json").read_text())
    subset = [record for record in records if record["category"] in categories]
    destination = GENERATED / "kits" / destination_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(subset, indent=2, ensure_ascii=False) + "\n")
    return destination


def common_docs(entries: dict[str, Path]):
    for name in ["game-overview.md", "game-flow.md", "complete-rules.md", "content-conflicts.md", "provenance.md", "developer-implementation-guide.md"]:
        add_file(entries, GENERATED / "docs" / name, f"docs/{name}")


def asset_categories(entries: dict[str, Path], categories: set[str]):
    for side in ["final", "legacy"]:
        for category in categories:
            add_tree(entries, PUBLIC / "assets" / "library" / side / category, f"assets/{side}/{category}")


def source_rules(entries: dict[str, Path]):
    root = STAGING / "changing-vegas" / "DUNA Changing Vegas "
    add_tree(entries, root / "GAME RULES", "source/original-rules")
    add_tree(entries, root / "Decklists and Changelog for Demo", "source/decklists-and-changelog")


def build():
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    PACKAGES.mkdir(parents=True, exist_ok=True)
    (GENERATED / "kits").mkdir(parents=True, exist_ok=True)
    results = []

    rules: dict[str, Path] = {}
    common_docs(rules)
    source_rules(rules)
    add_file(rules, GENERATED / "docs" / "missing-or-ambiguous-assets.md", "docs/missing-or-ambiguous-assets.md")
    add_file(rules, STAGING / "core" / "Royals-and-Rogues-Kit-v2.0.0" / "data" / "rules.json", "data/historical-core-rules.json")
    results.append(write_zip(f"Royals-and-Rogues-Rules-Kit-v{VERSION}.zip", "Royals & Rogues Rules Kit", rules, ["The original PDF remains authoritative evidence.", "Later deck-size and card-copy revisions remain visibly unresolved."]))

    power: dict[str, Path] = {}
    asset_categories(power, {"power-card", "power-back"})
    add_file(power, category_records({"power-card", "power-back"}, "power-card-catalog.json"), "data/power-card-catalog.json")
    add_file(power, GENERATED / "data" / "old-to-new-card-map.json", "data/old-to-new-card-map.json")
    add_file(power, GENERATED / "docs" / "content-conflicts.md", "docs/content-conflicts.md")
    results.append(write_zip(f"Royals-and-Rogues-Power-Cards-Kit-v{VERSION}.zip", "Royals & Rogues Power Cards Kit", power, ["Contains 105 final Power faces and the Power back.", "Legacy faces are preserved as gameplay and copy evidence.", "Final art contains no embedded digital rules copy."]))

    identities: dict[str, Path] = {}
    asset_categories(identities, {"class-identity", "court-identity"})
    add_file(identities, category_records({"class-identity", "court-identity"}, "classes-and-courts-catalog.json"), "data/classes-and-courts-catalog.json")
    core_data = STAGING / "core" / "Royals-and-Rogues-Kit-v2.0.0" / "data"
    for name in ["classes.json", "courts.json", "decklists.json"]:
        add_file(identities, core_data / name, f"data/historical-core-{name}")
    source_rules(identities)
    results.append(write_zip(f"Royals-and-Rogues-Classes-and-Courts-Kit-v{VERSION}.zip", "Royals & Rogues Classes and Courts Kit", identities, ["The eight final identity artworks are additional final-only records.", "Original decklists are included as design evidence."]))

    items: dict[str, Path] = {}
    asset_categories(items, {"item", "token"})
    add_file(items, category_records({"item", "token"}, "items-and-tokens-catalog.json"), "data/items-and-tokens-catalog.json")
    add_file(items, GENERATED / "docs" / "content-conflicts.md", "docs/content-conflicts.md")
    results.append(write_zip(f"Royals-and-Rogues-Items-and-Tokens-Kit-v{VERSION}.zip", "Royals & Rogues Items and Tokens Kit", items, ["Contains ten final Items and six final Tokens.", "Inside Connections has a recorded unresolved effect conflict."]))

    poker: dict[str, Path] = {}
    asset_categories(poker, {"poker-card"})
    add_file(poker, category_records({"poker-card"}, "poker-deck-catalog.json"), "data/poker-deck-catalog.json")
    add_file(poker, GENERATED / "data" / "verification.json", "reports/pixel-verification.json")
    results.append(write_zip(f"Royals-and-Rogues-Poker-Deck-Kit-v{VERSION}.zip", "Royals & Rogues Poker Deck Kit", poker, ["All 54 provided legacy poker assets are included.", "The independently supplied Reference Art copies passed pixel-identity checks."]))

    reference: dict[str, Path] = {}
    asset_categories(reference, {"reference-card", "status"})
    add_file(reference, category_records({"reference-card", "status"}, "reference-catalog.json"), "data/reference-catalog.json")
    add_file(reference, GENERATED / "data" / "verification.json", "reports/pixel-verification.json")
    results.append(write_zip(f"Royals-and-Rogues-Reference-Kit-v{VERSION}.zip", "Royals & Rogues Reference Kit", reference, ["Contains four original reference cards and two final table-state artworks."]))

    decorative: dict[str, Path] = {}
    asset_categories(decorative, {"decorative"})
    add_file(decorative, category_records({"decorative"}, "decorative-art-catalog.json"), "data/decorative-art-catalog.json")
    results.append(write_zip(f"Royals-and-Rogues-Decorative-Art-Kit-v{VERSION}.zip", "Royals & Rogues Decorative Art Kit", decorative, ["These files are non-gameplay world, title, logo, and marketing assets."]))

    master: dict[str, Path] = {}
    add_tree(master, PUBLIC / "assets" / "library" / "final", "assets/final")
    add_tree(master, PUBLIC / "assets" / "library" / "legacy", "assets/legacy")
    add_tree(master, GENERATED / "data", "data")
    add_tree(master, GENERATED / "docs", "docs")
    source_rules(master)
    core_root = STAGING / "core" / "Royals-and-Rogues-Kit-v2.0.0"
    add_tree(master, core_root / "data", "source/verified-core-data")
    add_tree(master, core_root / "schemas", "source/verified-core-schemas")
    add_tree(master, core_root / "design-system", "source/core-design-system")
    for source in ["app", "components", "lib", "scripts"]:
        add_tree(master, ROOT / source, f"site-source/{source}", lambda path: "_sites-preview" not in path.parts and "__pycache__" not in path.parts)
    for source in ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs", ".openai/hosting.json"]:
        add_file(master, ROOT / source, f"site-source/{source}")
    add_file(master, PUBLIC / "og.png", "site-source/public/og.png")
    results.append(write_zip(f"Royals-and-Rogues-Game-Library-Master-v{VERSION}.zip", "Royals & Rogues Game Library Master Kit", master, ["Complete canonical handoff.", "Intermediate renders, duplicate exports, company materials, press releases, and unrelated promotional photographs are excluded.", "Original and final gameplay art is full resolution and unmodified."]))

    index = {"version": VERSION, "createdAt": datetime.now(timezone.utc).isoformat(), "packages": results}
    (DOWNLOADS / "package-index.json").write_text(json.dumps(index, indent=2) + "\n")
    (DOWNLOADS / "PACKAGE-CHECKSUMS.sha256").write_text("\n".join(f'{item["sha256"]}  {item["filename"]}' for item in results) + "\n")
    print(json.dumps(index, indent=2))


if __name__ == "__main__":
    build()
