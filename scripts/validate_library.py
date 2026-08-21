#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"
PUBLIC = ROOT / "public"
PACKAGES = ROOT / "packages"
STAGED_FULL_RES = ROOT / "staging" / "site-full-res"


def sha256_bytes(handle) -> str:
    digest = hashlib.sha256()
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
    return digest.hexdigest()


def check(condition: bool, message: str, failures: list[str]):
    if not condition:
        failures.append(message)


def resolve_asset(value: str) -> Path:
    public_path = PUBLIC / value.lstrip("/")
    if public_path.is_file():
        return public_path
    try:
        library_path = Path(value.lstrip("/")).relative_to("assets/library")
    except ValueError:
        return public_path
    return STAGED_FULL_RES / library_path


def main():
    failures: list[str] = []
    records = json.loads((GENERATED / "data" / "card-catalog.json").read_text())
    sources = json.loads((GENERATED / "data" / "source-inventory.json").read_text())
    verifications = json.loads((GENERATED / "data" / "verification.json").read_text())
    expected_categories = {"power-card": 105, "power-back": 1, "poker-card": 54, "item": 10, "token": 6, "reference-card": 4, "status": 2, "class-identity": 4, "court-identity": 4, "decorative": 6}
    check(len(records) == 196, f"catalog count {len(records)} != 196", failures)
    check(Counter(record["category"] for record in records) == expected_categories, "category counts differ from expected canonical counts", failures)
    check(len({record["id"] for record in records}) == len(records), "record IDs are not unique", failures)
    check(sum(record["mappingStatus"] == "confirmed-pair" for record in records) == 180, "confirmed-pair count != 180", failures)
    check(sum(record["mappingStatus"] == "final-only" for record in records) == 10, "final-only count != 10", failures)
    check(sum(record["mappingStatus"] == "decorative" for record in records) == 6, "decorative count != 6", failures)
    check(sum(bool(record["requiresHumanCopyReview"]) for record in records) == 126, "copy-review count != 126", failures)
    check(len(sources) == 666, f"source inventory count {len(sources)} != 666", failures)
    check(sum(source["inclusion"] == "intermediate-excluded" for source in sources) == 6, "intermediate-excluded count != 6", failures)
    check(len(verifications) == 58 and all(item["passed"] for item in verifications), "pixel verification did not pass 58/58", failures)

    for record in records:
        for field in ["thumbnail", "originalCrop", "finalArtwork"]:
            value = record.get(field)
            if value:
                path = resolve_asset(value)
                check(path.is_file(), f"missing {field}: {record['id']} -> {value}", failures)
        for side in ["legacy", "final"]:
            asset = record.get(side)
            if not asset:
                continue
            path = resolve_asset(asset["publicPath"])
            if path.is_file():
                with Image.open(path) as image:
                    check(image.width == asset["width"] and image.height == asset["height"], f"dimension mismatch: {record['id']} {side}", failures)

    excluded_hashes = {source["sha256"] for source in sources if source["inclusion"] == "intermediate-excluded"}
    package_index = json.loads((PUBLIC / "downloads" / "package-index.json").read_text())
    check(len(package_index["packages"]) == 8, "package count != 8", failures)
    for package in package_index["packages"]:
        path = PACKAGES / package["filename"]
        check(path.is_file(), f"missing package: {package['filename']}", failures)
        if not path.is_file():
            continue
        with path.open("rb") as handle:
            check(sha256_bytes(handle) == package["sha256"], f"package checksum mismatch: {path.name}", failures)
        with zipfile.ZipFile(path) as archive:
            check(archive.testzip() is None, f"damaged archive member: {path.name}", failures)
            names = set(archive.namelist())
            check("MANIFEST.json" in names and "CHECKSUMS.sha256" in names, f"manifest/checksums missing: {path.name}", failures)
            manifest = json.loads(archive.read("MANIFEST.json"))
            check(manifest["fileCount"] + 2 == len(names), f"manifest file count mismatch: {path.name}", failures)
            if "Master" in path.name:
                check(not any(item["sha256"] in excluded_hashes for item in manifest["files"]), "master package contains an intermediate render", failures)
                check(any(name.endswith("Rule Book PDF.pdf") for name in names), "master package lacks original rulebook PDF", failures)
                check(sum(name.startswith("assets/final/power-card/") for name in names) == 105, "master package lacks 105 final Power faces", failures)
                check(sum(name.startswith("assets/legacy/power-card/") for name in names) == 105, "master package lacks 105 original Power faces", failures)

    report = {
        "status": "passed" if not failures else "failed",
        "catalogRecords": len(records),
        "sourceFiles": len(sources),
        "confirmedPairs": sum(record["mappingStatus"] == "confirmed-pair" for record in records),
        "pixelChecks": len(verifications),
        "packages": len(package_index["packages"]),
        "failures": failures,
    }
    (GENERATED / "data" / "final-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    (PUBLIC / "downloads" / "final-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
