#!/usr/bin/env python3
"""Build the Royals & Rogues canonical library from preserved source archives.

The script treats archive contents as evidence only. It never executes source
scripts and never modifies the extracted source trees.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "staging" / "extracted"
CHANGING = STAGING / "changing-vegas" / "DUNA Changing Vegas "
CORE = STAGING / "core" / "Royals-and-Rogues-Kit-v2.0.0"
REFERENCE = STAGING / "reference-art" / "Royals-and-Rogues-Kit-v2.0.0"
WORLD = STAGING / "world-art" / "Royals-and-Rogues-Kit-v2.0.0"
GENERATED = ROOT / "generated"
DATA_OUT = GENERATED / "data"
DOCS_OUT = GENERATED / "docs"
PUBLIC_DATA = ROOT / "public" / "data"
PUBLIC_DOWNLOADS = ROOT / "public" / "downloads"
PUBLIC_LIBRARY = ROOT / "public" / "assets" / "library"

ARCHIVES = {
    "changing-vegas": "DUNA Changing Vegas -20260821T015758Z-1-001.zip",
    "core": "Royals-and-Rogues-Kit-v2.0.0-01-Core.zip",
    "power-art-01": "Royals-and-Rogues-Kit-v2.0.0-02-Power-Art-01.zip",
    "power-art-02": "Royals-and-Rogues-Kit-v2.0.0-03-Power-Art-02.zip",
    "power-art-03": "Royals-and-Rogues-Kit-v2.0.0-04-Power-Art-03.zip",
    "power-art-04": "Royals-and-Rogues-Kit-v2.0.0-05-Power-Art-04.zip",
    "power-art-05": "Royals-and-Rogues-Kit-v2.0.0-06-Power-Art-05.zip",
    "world-art": "Royals-and-Rogues-Kit-v2.0.0-07-World-Art.zip",
    "reference-art": "Royals-and-Rogues-Kit-v2.0.0-08-Reference-Art.zip",
}

ORIGINAL_NAMES = {
    "jack_bachelor": "Eligible Bachelor",
    "jack_guerilla": "Guerilla Tactics",
    "jack_mithril": "Mithril Armaments",
    "jack_press": "Press the Advantage",
    "joker_chance": "Game of Chance",
    "joker_drunken": "Drunken Boxing",
    "joker_life": "Life of the Party",
    "joker_trade": "Trading Up",
    "king_crown": "Midas Crown",
    "king_gold": "Gold for Gifts",
    "king_might": "Match Their Might",
    "king_stimulus": "Stimulus Package",
    "queen_adored": "Adored by All",
    "queen_favorite": "Dealer's Favorite",
    "queen_fighter": "Analytical Fighter",
    "queen_ring": "Future Sight Ring",
}

TIMING_WORDS = ["Setup", "Round", "Counter", "Showdown", "All"]
KEYWORD_WORDS = [
    "Draw", "Fire", "Flex", "Hot Streak", "Mulligan", "One Shot", "Peek",
    "Recover", "Replay", "Rummage", "Stealthed", "Swap", "Table Talk",
    "Duelist", "Comp Chip", "Tilted", "Heating Up", "Token", "Wild",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_info(path: Path) -> tuple[int | None, int | None, str | None]:
    try:
        with Image.open(path) as image:
            return image.width, image.height, image.format
    except Exception:
        return None, None, None


def link_or_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() or destination.is_symlink():
        destination.unlink()
    try:
        os.link(source, destination)
    except OSError:
        shutil.copy2(source, destination)


def make_thumbnail(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((560, 760), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=84, method=6)


def pixels_identical(first: Path, second: Path) -> bool:
    try:
        with Image.open(first) as a, Image.open(second) as b:
            aa = a.convert("RGBA")
            bb = b.convert("RGBA")
            return aa.size == bb.size and ImageChops.difference(aa, bb).getbbox() is None
    except Exception:
        return False


def archive_key(path: Path) -> str:
    rel = path.relative_to(STAGING)
    return rel.parts[0]


def probable_purpose(path: Path) -> tuple[str, str]:
    rel = path.relative_to(STAGING).as_posix().lower()
    suffix = path.suffix.lower()
    if "/game cards/" in rel:
        return "legacy-game-component", "canonical-source"
    if "/game rules/" in rel:
        return "legacy-rules-or-reference", "canonical-source"
    if "decklists and changelog" in rel:
        return "later-rule-or-deck-revision", "supporting-source"
    if any(term in rel for term in ["/company description/", "/press releases/", "/photos/", "/duna day"]):
        return "company-or-event-material", "extraneous-excluded"
    if "/assets/royals-and-rogues/v2/art/power/" in rel and suffix == ".png":
        return "final-power-art", "verified-final"
    if "/assets/royals-and-rogues/v2/art/" in rel and suffix == ".png":
        return "final-world-art", "verified-final"
    if "/assets/royals-and-rogues/v2/art/" in rel and suffix in {".jpg", ".jpeg"}:
        return "duplicate-final-export", "duplicate-excluded"
    if archive_key(path) == "reference-art":
        if any(part in rel for part in ["/cards/", "/items/"]) and "/gallery/" not in rel:
            return "noncanonical-reference-render", "intermediate-excluded"
        return "reference-or-duplicate", "reference-only"
    if archive_key(path) == "core":
        if "/data/" in rel or "/docs/" in rel or "/schemas/" in rel or "source-reference" in rel:
            return "structured-supporting-source", "supporting-source"
        if "/scripts/" in rel or "/skills/" in rel:
            return "embedded-instruction-or-script", "source-only-not-executed"
        return "core-presentation-source", "reference-only"
    return "unclassified-source", "source-only"


def build_source_inventory() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(p for p in STAGING.rglob("*") if p.is_file()):
        width, height, image_format = image_info(path)
        purpose, inclusion = probable_purpose(path)
        key = archive_key(path)
        records.append({
            "archive": ARCHIVES.get(key, key),
            "stagingGroup": key,
            "internalPath": path.relative_to(STAGING / key).as_posix(),
            "filename": path.name,
            "fileType": path.suffix.lower().lstrip(".") or "unknown",
            "width": width,
            "height": height,
            "imageFormat": image_format,
            "fileSize": path.stat().st_size,
            "sha256": sha256(path),
            "probablePurpose": purpose,
            "inclusion": inclusion,
        })
    return records


def normalized_stem(path: Path) -> str:
    return re.sub(r"_+", "_", path.stem.lower().replace("-", "_").replace(" ", "_")).strip("_")


def final_power_index() -> dict[str, Path]:
    index: dict[str, Path] = {}
    for group in sorted(STAGING.glob("power-art-*")):
        for path in group.rglob("*.png"):
            if "/art/power/" not in path.as_posix():
                continue
            index[normalized_stem(path)] = path
    return index


def world_png_index() -> dict[str, Path]:
    return {normalized_stem(path): path for path in WORLD.rglob("*.png")}


def clean_lines(lines: list[str] | None, original_name: str) -> list[str]:
    values = [re.sub(r"\s+", " ", str(line)).strip() for line in (lines or []) if str(line).strip()]
    if values:
        values[0] = original_name
    return values


def extract_timing(lines: list[str], filename_hint: str | None = None) -> list[str]:
    text = " | ".join(lines + ([filename_hint] if filename_hint else []))
    found: list[str] = []
    for word in TIMING_WORDS:
        if re.search(rf"\b{re.escape(word)}\b", text, flags=re.I):
            found.append(word)
    return found


def extract_keywords(lines: list[str]) -> list[str]:
    text = " | ".join(lines)
    return [word for word in KEYWORD_WORDS if re.search(rf"\b{re.escape(word)}\b", text, flags=re.I)]


def effect_lines(lines: list[str], original_name: str) -> list[str]:
    output: list[str] = []
    metadata = re.compile(r"^(jumbo promo|\d+\s*/\s*\d+)$", re.I)
    type_line = re.compile(r"^(setup|round|counter|showdown|all|wild|token|fire|tilt|tilted|flex|one shot|table talk)(\s*/\s*(setup|round|counter|showdown|all|wild|token|fire|tilt|tilted|flex|one shot|table talk))*$", re.I)
    for index, line in enumerate(lines):
        if index == 0 or line.casefold() == original_name.casefold():
            continue
        if metadata.match(line) or type_line.match(line):
            continue
        output.append(line)
    return output


def public_asset(source: Path | None, role: str, category: str, asset_id: str) -> tuple[str | None, dict[str, Any] | None]:
    if source is None or not source.exists():
        return None, None
    suffix = source.suffix.lower()
    destination = PUBLIC_LIBRARY / role / category / f"{asset_id}{suffix}"
    link_or_copy(source, destination)
    width, height, image_format = image_info(source)
    web_path = "/" + destination.relative_to(ROOT / "public").as_posix()
    return web_path, {
        "sourcePath": source.relative_to(STAGING).as_posix(),
        "publicPath": web_path,
        "filename": source.name,
        "width": width,
        "height": height,
        "format": image_format,
        "fileSize": source.stat().st_size,
        "sha256": sha256(source),
    }


def thumbnail_asset(source: Path | None, asset_id: str) -> str | None:
    if source is None or not source.exists():
        return None
    destination = PUBLIC_LIBRARY / "thumbs" / f"{asset_id}.webp"
    make_thumbnail(source, destination)
    return "/" + destination.relative_to(ROOT / "public").as_posix()


def base_record(
    *, asset_id: str, name: str, original_name: str | None, category: str,
    family: str | None, class_id: str | None, court_id: str | None,
    final_source: Path | None, legacy_source: Path | None,
    gameplay: bool, text_lines: list[str] | None, copy_status: str,
    source_path: str | None, conflicts: list[dict[str, Any]],
    status_override: str | None = None, notes: list[str] | None = None,
) -> dict[str, Any]:
    original_name = original_name or name
    lines = clean_lines(text_lines, original_name)
    final_path, final_meta = public_asset(final_source, "final", category, asset_id)
    legacy_path, legacy_meta = public_asset(legacy_source, "legacy", category, asset_id)
    status = status_override or (
        "confirmed-pair" if final_source and legacy_source else
        "final-only" if final_source else
        "legacy-only" if legacy_source else "ambiguous"
    )
    timing = extract_timing(lines, source_path)
    keywords = extract_keywords(lines)
    conflict_notes = [conflict for conflict in conflicts if conflict.get("assetId") == asset_id]
    record = {
        "id": asset_id,
        "slug": asset_id.replace("_", "-"),
        "name": name,
        "originalName": original_name,
        "category": category,
        "family": family,
        "class": class_id,
        "court": court_id,
        "type": " / ".join(timing) if timing else category.replace("-", " ").title(),
        "timing": timing,
        "abilities": keywords,
        "effect": effect_lines(lines, original_name),
        "digitalCopy": {
            "name": name,
            "type": " / ".join(timing) if timing else category.replace("-", " ").title(),
            "keywords": keywords,
            "effect": effect_lines(lines, original_name),
        },
        "printedTextVerbatim": lines,
        "rulesNotes": [],
        "gameplayOrDecorative": "gameplay" if gameplay else "decorative",
        "mappingStatus": status,
        "mappingConfidence": "high" if status == "confirmed-pair" else "verified-final" if status in {"final-only", "decorative"} else "requires-review",
        "copyStatus": copy_status,
        "requiresHumanCopyReview": copy_status != "verified",
        "conflicts": conflict_notes,
        "notes": notes or [],
        "legacy": legacy_meta,
        "final": final_meta,
        "originalPdf": None,
        "originalPdfPage": None,
        "originalCrop": legacy_path,
        "finalArtwork": final_path,
        "thumbnail": thumbnail_asset(final_source or legacy_source, asset_id),
        "provenance": {
            "legacySource": legacy_meta["sourcePath"] if legacy_meta else None,
            "finalSource": final_meta["sourcePath"] if final_meta else None,
            "structuredSource": source_path,
        },
        "inclusionStatus": "included",
    }
    if legacy_meta and original_name:
        record["notes"].append("The authoritative legacy face is supplied as a standalone original image; no complete legacy card-sheet PDF was present, so that image also serves as the original crop.")
    return record


def build_catalog() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    power_cards = read_json(CORE / "data" / "power-cards.json")
    items = read_json(CORE / "data" / "items.json")
    tokens = read_json(CORE / "data" / "tokens.json")
    playing = read_json(CORE / "data" / "playing-cards.json")
    references = read_json(CORE / "data" / "reference-cards.json")
    classes = read_json(CORE / "data" / "classes.json")
    courts = read_json(CORE / "data" / "courts.json")
    conflicts = read_json(CORE / "data" / "content-conflicts.json")
    power_art = final_power_index()
    world_art = world_png_index()
    reference_root = REFERENCE / "assets" / "royals-and-rogues" / "gallery"
    records: list[dict[str, Any]] = []
    verification: list[dict[str, Any]] = []

    for item in power_cards:
        asset_id = item["id"]
        legacy = CHANGING / item["sourcePath"]
        final = world_art.get("power_back") if asset_id == "back" else power_art.get(asset_id)
        record_id = "power_back" if asset_id == "back" else asset_id
        original_name = "Power Card Back" if asset_id == "back" else ORIGINAL_NAMES.get(asset_id, item["name"])
        record = base_record(
            asset_id=record_id,
            name=item["name"],
            original_name=original_name,
            category="power-back" if asset_id == "back" else "power-card",
            family=item.get("family"),
            class_id=item.get("family") if item.get("family") in {"merchant", "noble", "rogue", "warrior"} else None,
            court_id=item.get("family") if item.get("family") in {"king", "queen", "jack", "joker"} else None,
            final_source=final,
            legacy_source=legacy if legacy.exists() else None,
            gameplay=True,
            text_lines=item.get("printedTextVerbatim"),
            copy_status=item.get("copyStatus", "provisional"),
            source_path=item.get("sourcePath"),
            conflicts=conflicts,
        )
        records.append(record)

    for collection, category in [(items, "item"), (tokens, "token")]:
        for item in collection:
            asset_id = item["id"]
            legacy = CHANGING / item["sourcePath"]
            final = world_art.get(asset_id)
            records.append(base_record(
                asset_id=asset_id,
                name=item["name"],
                original_name=item["name"],
                category=category,
                family=item.get("itemType"),
                class_id=None,
                court_id=None,
                final_source=final,
                legacy_source=legacy if legacy.exists() else None,
                gameplay=True,
                text_lines=item.get("printedTextVerbatim"),
                copy_status=item.get("copyStatus", "provisional"),
                source_path=item.get("sourcePath"),
                conflicts=conflicts,
                notes=["Tokens persist across hands; Items are played and resolved as one-shot game components."] if category == "token" else [],
            ))

    for item in playing:
        asset_id = f"poker_{item['id']}"
        legacy = CHANGING / item["sourcePath"]
        final = reference_root / "cards" / item["runtimeFilename"]
        identical = legacy.exists() and final.exists() and pixels_identical(legacy, final)
        verification.append({"id": asset_id, "check": "legacy-reference-pixel-identity", "passed": identical})
        records.append(base_record(
            asset_id=asset_id,
            name=item["name"],
            original_name=item["name"],
            category="poker-card",
            family="poker",
            class_id=None,
            court_id=None,
            final_source=final if final.exists() else legacy,
            legacy_source=legacy if legacy.exists() else None,
            gameplay=True,
            text_lines=item.get("printedTextVerbatim"),
            copy_status=item.get("copyStatus", "verified"),
            source_path=item.get("sourcePath"),
            conflicts=conflicts,
            notes=["The current digital poker face is a pixel-identical carry-forward of the authoritative original scan." if identical else "Reference copy requires visual verification."],
        ))

    for item in references:
        asset_id = f"reference_{item['id']}"
        legacy = CHANGING / item["sourcePath"]
        final = reference_root / "reference" / item["runtimeFilename"]
        identical = legacy.exists() and final.exists() and pixels_identical(legacy, final)
        verification.append({"id": asset_id, "check": "legacy-reference-pixel-identity", "passed": identical})
        records.append(base_record(
            asset_id=asset_id,
            name=item["name"],
            original_name=item["name"],
            category="reference-card",
            family="reference",
            class_id=None,
            court_id=None,
            final_source=final if final.exists() else legacy,
            legacy_source=legacy if legacy.exists() else None,
            gameplay=True,
            text_lines=item.get("printedTextVerbatim"),
            copy_status=item.get("copyStatus", "provisional"),
            source_path=item.get("sourcePath"),
            conflicts=conflicts,
            notes=["The digital reference face is a pixel-identical carry-forward of the authoritative original scan." if identical else "Reference copy requires visual verification."],
        ))

    for status_id, name in [("heating_up", "Heating Up"), ("tilted", "Tilted")]:
        records.append(base_record(
            asset_id=status_id, name=name, original_name=None, category="status",
            family="status", class_id=None, court_id=None,
            final_source=world_art.get(status_id), legacy_source=None,
            gameplay=True, text_lines=[name], copy_status="verified", source_path=None,
            conflicts=conflicts, status_override="final-only",
            notes=["Final digital status art; the legacy rulebook describes this state but does not supply a standalone authoritative face in the archive."],
        ))

    for item in classes:
        asset_id = f"class_{item['id']}"
        records.append(base_record(
            asset_id=asset_id, name=item["name"], original_name=None, category="class-identity",
            family=item["id"], class_id=item["id"], court_id=None,
            final_source=power_art.get(asset_id), legacy_source=None,
            gameplay=True, text_lines=[item["name"], item.get("summary", "")], copy_status="verified", source_path="Core data/classes.json",
            conflicts=conflicts, status_override="final-only",
            notes=[item.get("playstyle", "")],
        ))

    for item in courts:
        asset_id = f"court_{item['id']}"
        records.append(base_record(
            asset_id=asset_id, name=item["name"], original_name=None, category="court-identity",
            family=item["id"], class_id=None, court_id=item["id"],
            final_source=power_art.get(asset_id), legacy_source=None,
            gameplay=True, text_lines=[item["name"], item.get("trait", "")], copy_status="verified", source_path="Core data/courts.json",
            conflicts=conflicts, status_override="final-only",
            notes=[f"Court trait: {item.get('trait', '')}"],
        ))

    decorative_sources = [
        ("decorative_key_art", "Royals & Rogues key art", world_art.get("key_art")),
        ("decorative_items_master", "Items enamel study", world_art.get("items_master")),
        ("decorative_logo", "Royals & Rogues logo", CORE / "design-system/identity/royals-and-rogues-logo-primary.png"),
        ("decorative_mark", "Royals & Rogues mark", CORE / "design-system/identity/royals-and-rogues-mark.png"),
        ("decorative_identity_master", "Royals & Rogues identity master", CORE / "design-system/identity/royals-and-rogues-key-art-master.png"),
        ("decorative_title_card", "Royals & Rogues title card", CORE / "design-system/identity/royals-and-rogues-title-card.jpg"),
    ]
    for asset_id, name, source in decorative_sources:
        records.append(base_record(
            asset_id=asset_id, name=name, original_name=None, category="decorative",
            family="marketing", class_id=None, court_id=None,
            final_source=source if source and source.exists() else None, legacy_source=None,
            gameplay=False, text_lines=[name], copy_status="verified", source_path=None,
            conflicts=conflicts, status_override="decorative",
            notes=["Approved presentation asset. It is not a playable card or game component."],
        ))

    records.sort(key=lambda record: (record["category"], record["name"].casefold(), record["id"]))
    return records, verification


def markdown_table(records: list[dict[str, Any]], mapping_only: bool = False) -> str:
    header = "| ID | Name | Category | Family | Timing | Status | Copy | Legacy | Final |\n|---|---|---|---|---|---|---|---|---|\n"
    lines = []
    for record in records:
        if mapping_only and record["mappingStatus"] not in {"confirmed-pair", "legacy-only", "final-only", "ambiguous"}:
            continue
        lines.append("| {id} | {name} | {category} | {family} | {timing} | {status} | {copy} | {legacy} | {final} |".format(
            id=f"`{record['id']}`",
            name=record["name"].replace("|", "\\|"),
            category=record["category"],
            family=record.get("family") or "—",
            timing=", ".join(record.get("timing") or []) or "—",
            status=record["mappingStatus"],
            copy=record["copyStatus"],
            legacy="yes" if record.get("legacy") else "—",
            final="yes" if record.get("final") else "—",
        ))
    return header + "\n".join(lines) + "\n"


def game_overview_md(counts: dict[str, int]) -> str:
    return f"""# Royals & Rogues

## The game in one minute

Royals & Rogues begins with No-Limit Texas Hold'em, then changes what a hand can become. Two to four players bring a personal Power Deck shaped by a Class and a Court. Powers may prepare the hand, alter a betting round, answer another Power, or change the result just before cards are revealed. Items enter the poker deck. Tokens persist across hands. Heating Up unlocks Fire effects; Tilted changes which Powers remain available.

The objective is simple: **win all coins on the table**.

## What this library connects

- **Original game** — the supplied legacy cards and official rulebook remain the evidence for the playable physical design.
- **Final digital art** — the quiet-enamel images are preserved at full resolution with no rules text burned into them.
- **Digital copy** — names, timing, effects, keywords, and review status live as separate structured data.
- **Engineering handoff** — stable IDs, mappings, hashes, source paths, and downloadable kits make replacement work traceable.

## Verified scope

- {counts.get('allRecords', 0)} catalog records
- {counts.get('confirmed-pair', 0)} confirmed old-to-new pairs
- {counts.get('final-only', 0)} verified final-only game objects
- {counts.get('decorative', 0)} clearly separated decorative assets
- {counts.get('copyReviewRequired', 0)} source transcriptions still marked for editorial review

## Four ways to shape a Power Deck

- **Merchant** — resources, Items, patient setup, and conversion of accumulated advantage.
- **Noble** — table politics, protection, steady value, and control.
- **Rogue** — pressure, misdirection, opportunism, and dangerous reversals.
- **Warrior** — direct action, aggression, challenges, and decisive hands.

Each Class combines with one Court: **King** (wealth), **Queen** (intellect), **Jack** (skill), or **Joker** (craftiness).
"""


def game_flow_md() -> str:
    return """# Game flow

## Before the match

1. Seat two to four players and place the bank, markers, Items, status material, and references within reach.
2. Shuffle one Joker into the 52-card poker deck. Keep the other Joker scans out of the active deck unless a later rule explicitly calls for them.
3. Give each player 100 coins.
4. Choose Classes clockwise from the dealer, then choose Courts in reverse order.
5. Build and shuffle each player's Power Deck. Keep the ordinary Power discard and One Shot discard separate.

## Every hand

1. **Draw a Power.** Draw three on the first hand; draw one on later hands.
2. **Deal three hole cards** to each player.
3. **Prepare.** Play Setup Powers after the deal and before betting. Resolve them clockwise from the dealer. Discard down to the Power hand limit.
4. **Bet and respond.** During each betting round, the acting player may use compatible Round Powers before checking, betting, or folding. Triggered Counter Powers may answer actions even outside their owner's turn. Resolve a Counter chain newest response first.
5. **Reveal the board** according to ordinary Texas Hold'em streets, allowing the game's defined Power windows around those streets.
6. **Prepare the showdown.** After the last betting round, eligible players may set Showdown Powers face down. Resolve them in betting order.
7. **Reveal and settle.** Reveal hole cards, determine the best legal poker hand, award the pot, and update Heating Up or Tilted.

## If the match runs long

The original rulebook recommends ten-minute levels with antes of 1, 3, 5, and 10. If more than one player remains after the last level, play four sudden-death hands at a 25 ante; the largest remaining stack wins.

## Important unresolved revision

The official PDF and Core data specify a 40-card Power Deck. A later July 2026 changelog says the deck was reduced to 30 and adds Table Talk, Replay, and expanded Token rules. This library preserves the 40-card rule as the original playable authority and records the 30-card change as a later unresolved revision rather than silently combining them.
"""


def rules_md() -> str:
    return """# Complete rules

## 1. Objective and players

Royals & Rogues is for two to four players, ages 13 and up, and normally takes 20–45 minutes. Win all coins on the table.

## 2. Poker foundation

Use ordinary No-Limit Texas Hold'em hand rankings and betting logic except where a Royals & Rogues component explicitly changes them. The game uses antes instead of small and big blinds, gives each player three hole cards, and permits Powers at defined timing windows.

## 3. Game material

- One 52-card poker deck plus one active Joker
- Individual Power Decks
- Items that may enter the poker deck
- Persistent Tokens
- Heating Up and Tilted status markers
- Coins, dealer marker, references, and table markers

## 4. Setup

1. Shuffle one Joker into the 52-card poker deck; set the other Joker variants aside.
2. Set aside Items, Tokens, status material, references, and table markers.
3. Give each player 100 coins.
4. Determine the dealer by drawing for high card.
5. Choose Class clockwise from the dealer. Choose Court in reverse order, so the last player to choose Class chooses Court first.
6. Build and shuffle each Power Deck.
7. Place the Power Deck on the player's right, its ordinary discard beside it, and a separate One Shot discard on the player's left.

## 5. Power Cards

Powers are separate from poker cards. A player's Power hand is hidden. The original rulebook limits the Power hand to five after Setup.

### Setup

Play after hole cards are dealt and before betting begins. Place the Power face down, then reveal and resolve Setup Powers clockwise from the dealer.

### Round

Play on your turn during a betting round, before you check, bet, or fold. You may chain compatible Round Powers before taking the poker action.

### Showdown

Play after the last betting round but before hole cards are revealed. Eligible players place Showdown Powers face down, then resolve them in betting order.

### Counter

Play when the printed trigger occurs, including outside your turn. If several responses form a chain, resolve the newest response first.

## 6. Abilities and defined terms

- **Draw** — take the stated number of cards from the Power Deck.
- **Fire** — playable while Heating Up unless another effect says otherwise.
- **Flex** — may be played while Tilted.
- **Hot Streak** — an enhanced effect available while Heating Up.
- **Mulligan** — replace the indicated card with the next card from the appropriate deck.
- **One Shot** — after resolving, place the Power in the separate One Shot discard.
- **Peek** — privately look at the indicated hidden card.
- **Recover** — remove or mitigate Tilted as stated.
- **Replay** — play the Power again from the ordinary discard, then move it to the One Shot discard.
- **Rummage** — use the Item-linked discard or retrieval action printed on the card.
- **Table Talk** — the later changelog permits these Powers after folding; this is recorded as a revision to reconcile.
- **Token** — a persistent effect that remains in play until a rule removes it.

## 7. Items and Tokens

Items enter the poker deck through Power effects. Play or discard an Item as directed, then place it in the muck instead of an ordinary Power discard. If an Item appears as a board card, remove it and replace it with the next poker card.

Tokens are persistent effects. They remain with their owner across hands and respond automatically to the events specified on them. The exact Inside Connections effect is disputed between the legacy face, the historical specification, and the later changelog; see the conflict report.

## 8. Status conditions

### Heating Up

Heating Up unlocks Fire Powers. The original rulebook usually grants it after winning two hands in a row and removes it after a loss. Specific Powers may alter that state.

### Tilted

While Tilted, a player may use only Tilted Powers and Powers with Flex. Winning a hand normally removes Tilted; specific Powers may also alter it.

## 9. A hand from start to finish

1. Draw one Power; draw three on the first hand.
2. Deal three hole cards to each player.
3. Resolve Setup Powers and discard down to five Powers.
4. Conduct the poker betting rounds with Round and Counter opportunities.
5. Resolve Showdown Powers.
6. Reveal hands, award the pot, and update persistent state.

## 10. Match structure

The original recommended structure is No-Limit with ten-minute levels and antes of 1, 3, 5, and 10. If players remain after the last level, play four hands at a 25 ante; the largest stack wins.

## 11. Editorial status

This document reconstructs the official rulebook in accessible text. It does not conceal later conflicts. The attached original PDF remains the visual evidence, and every source-derived card transcription carries its review state in the catalog.
"""


def write_docs(records: list[dict[str, Any]], source_inventory: list[dict[str, Any]], verification: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(record["mappingStatus"] for record in records)
    counts.update({"allRecords": len(records)})
    counts["copyReviewRequired"] = sum(1 for record in records if record["requiresHumanCopyReview"])
    counts["gameplay"] = sum(1 for record in records if record["gameplayOrDecorative"] == "gameplay")
    counts["decorativeAssets"] = sum(1 for record in records if record["gameplayOrDecorative"] == "decorative")
    counts["intermediateExcludedFiles"] = sum(1 for item in source_inventory if item["inclusion"] == "intermediate-excluded")
    counts["sourceFiles"] = len(source_inventory)
    counts["verificationChecks"] = len(verification)
    counts["verificationPassed"] = sum(1 for item in verification if item["passed"])
    result = dict(counts)

    DOCS_OUT.mkdir(parents=True, exist_ok=True)
    (DOCS_OUT / "game-overview.md").write_text(game_overview_md(result), encoding="utf-8")
    (DOCS_OUT / "game-flow.md").write_text(game_flow_md(), encoding="utf-8")
    (DOCS_OUT / "complete-rules.md").write_text(rules_md(), encoding="utf-8")
    (DOCS_OUT / "card-catalog.md").write_text("# Card and game-object catalog\n\n" + markdown_table(records), encoding="utf-8")
    mappings = [record for record in records if record["mappingStatus"] in {"confirmed-pair", "legacy-only", "final-only", "ambiguous"}]
    (DOCS_OUT / "old-to-new-card-map.md").write_text("# Original-to-final mapping\n\n" + markdown_table(mappings, mapping_only=True), encoding="utf-8")

    core_conflicts = read_json(CORE / "data" / "content-conflicts.json")
    conflict_text = "# Content conflicts\n\nThese conflicts are intentionally visible. No source was silently rewritten.\n\n"
    for conflict in core_conflicts:
        conflict_text += f"## {conflict['id'].replace('_', ' ').title()}\n\n"
        conflict_text += (conflict.get("detail") or conflict.get("candidateCurrent") or "Unresolved source disagreement.") + "\n\n"
        if conflict.get("alternatives"):
            conflict_text += "Alternatives:\n" + "".join(f"- {value}\n" for value in conflict["alternatives"]) + "\n"
        if conflict.get("evidence"):
            conflict_text += "Evidence:\n" + "".join(f"- {value}\n" for value in conflict["evidence"]) + "\n"
    conflict_text += "## Power Deck size and later keyword revision\n\nThe official rulebook and Core data specify 40 Powers. The 7.21.2026 changelog specifies 30 and adds Table Talk, Replay, and expanded Token rules. The original 40-card rule remains the playable legacy authority in this release; the later change requires product-owner ratification.\n"
    (DOCS_OUT / "content-conflicts.md").write_text(conflict_text, encoding="utf-8")

    missing = "# Missing or ambiguous material\n\n"
    missing += f"- Mapping ambiguities: {result.get('ambiguous', 0)}.\n"
    missing += f"- Legacy-only records: {result.get('legacy-only', 0)}.\n"
    missing += f"- Final-only records: {result.get('final-only', 0)}. These are verified digital statuses and Class/Court identity art rather than lost legacy cards.\n"
    missing += f"- Copy records requiring editorial review: {result['copyReviewRequired']}. The source face and current transcription are presented together so an editor can resolve them without research.\n"
    missing += "- The application repository and final runtime migration were not supplied, so the library provides stable IDs and replacement manifests but cannot verify the live application wiring.\n"
    missing += "- The supplied rulebook is image-based. It shows representative cards and rules, while authoritative individual legacy faces are supplied separately as original PNG files.\n"
    (DOCS_OUT / "missing-or-ambiguous-assets.md").write_text(missing, encoding="utf-8")

    provenance_md = "# Provenance\n\n## Source precedence\n\n1. Original game faces and official rulebook\n2. Final quiet-enamel Power and World art\n3. Core structured data after comparison\n4. Existing presentation site\n5. Reference Art only when independently verified\n\n## Important handling\n\n- Archive scripts and instructions were never executed.\n- Original artwork was copied byte-for-byte; thumbnails are separate derivatives.\n- Reference poker and reference-card copies were accepted only after pixel comparison with the originals.\n- JPEG duplicates of final Item and Token PNGs were not promoted into the canonical packages.\n"
    (DOCS_OUT / "provenance.md").write_text(provenance_md, encoding="utf-8")

    source_counts = Counter(item["inclusion"] for item in source_inventory)
    inventory_md = "# Source inventory\n\n"
    inventory_md += f"Total preserved source files: **{len(source_inventory)}**.\n\n"
    inventory_md += "## Disposition summary\n\n" + "".join(f"- **{name}** — {count}\n" for name, count in sorted(source_counts.items())) + "\n"
    inventory_md += "The complete per-file inventory, dimensions, sizes, purposes, and SHA-256 hashes are in `source-inventory.json`.\n"
    (DOCS_OUT / "source-inventory.md").write_text(inventory_md, encoding="utf-8")

    implementation = """# Developer implementation guide

## Load order

1. Load `card-catalog.json` and index records by stable `id`.
2. Use `finalArtwork` for the card's default image view.
3. Render `digitalCopy` as semantic interface text; never bake it into the final art.
4. Offer `originalCrop` as the legacy evidence view.
5. Respect `copyStatus`, `requiresHumanCopyReview`, and `conflicts` in editorial tools.
6. Keep gameplay and decorative records separate.

## Card views

- **ART** — final text-free artwork.
- **CARD TEXT** — name, timing, keywords, and effect from structured data.
- **ORIGINAL CARD** — authoritative legacy face.
- **COMPARE** — final and original side by side.

## Replacement rule

Find the old runtime asset through the record's legacy filename or provenance path, replace its visual layer with `finalArtwork`, and bind the software text layer to `digitalCopy`. Do not infer filenames at runtime; use the supplied manifest.

## State model

Model Setup, Round, Showdown, and Counter as explicit legal timing windows. Resolve Counter chains newest-first. Keep the ordinary Power discard and One Shot discard distinct. Treat Heating Up and Tilted as explicit logged state.
"""
    (DOCS_OUT / "developer-implementation-guide.md").write_text(implementation, encoding="utf-8")
    return result


def copy_download_documents() -> None:
    PUBLIC_DOWNLOADS.mkdir(parents=True, exist_ok=True)
    for path in DOCS_OUT.glob("*.md"):
        shutil.copy2(path, PUBLIC_DOWNLOADS / path.name)
    for path in DATA_OUT.glob("*.json"):
        shutil.copy2(path, PUBLIC_DOWNLOADS / path.name)


def write_checksums() -> None:
    targets = sorted(
        [path for path in PUBLIC_LIBRARY.rglob("*") if path.is_file()] +
        [path for path in DATA_OUT.rglob("*") if path.is_file()] +
        [path for path in DOCS_OUT.rglob("*") if path.is_file()]
    )
    lines = [f"{sha256(path)}  {path.relative_to(ROOT).as_posix()}" for path in targets]
    (GENERATED / "checksums.sha256").write_text("\n".join(lines) + "\n", encoding="utf-8")
    shutil.copy2(GENERATED / "checksums.sha256", PUBLIC_DOWNLOADS / "checksums.sha256")


def main() -> None:
    for path in [DATA_OUT, DOCS_OUT, PUBLIC_DATA, PUBLIC_DOWNLOADS, PUBLIC_LIBRARY]:
        if path.exists():
            shutil.rmtree(path)
        path.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    source_inventory = build_source_inventory()
    write_json(DATA_OUT / "source-inventory.json", source_inventory)
    records, verification = build_catalog()
    mappings = [{
        "id": record["id"],
        "originalName": record["originalName"],
        "currentName": record["name"],
        "category": record["category"],
        "mappingStatus": record["mappingStatus"],
        "mappingConfidence": record["mappingConfidence"],
        "legacy": record["legacy"],
        "final": record["final"],
        "digitalCopy": record["digitalCopy"],
        "conflicts": record["conflicts"],
    } for record in records if record["mappingStatus"] != "decorative"]
    provenance = {
        "generatedAt": generated_at,
        "sourcePrecedence": [
            "Original cards and official Changing Vegas rulebook",
            "Final quiet-enamel Power Art and World Art",
            "Verified Core structured data",
            "Existing design site as presentation reference only",
            "Reference Art only after independent verification",
        ],
        "archives": list(ARCHIVES.values()),
        "recordCount": len(records),
        "records": [{"id": record["id"], **record["provenance"]} for record in records],
    }
    write_json(DATA_OUT / "card-catalog.json", records)
    write_json(DATA_OUT / "old-to-new-card-map.json", mappings)
    write_json(DATA_OUT / "provenance.json", provenance)
    write_json(DATA_OUT / "verification.json", verification)
    counts = write_docs(records, source_inventory, verification)
    write_json(DATA_OUT / "counts.json", counts)

    for path in DATA_OUT.glob("*.json"):
        shutil.copy2(path, PUBLIC_DATA / path.name)
    copy_download_documents()
    write_checksums()
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
