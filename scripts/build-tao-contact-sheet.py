from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CARDS = json.loads((ROOT / "app/tao/tao-cards.generated.json").read_text())
ART = ROOT / "public/tao/tiles/art"
OUTPUT = ROOT / "public/tao/tao-75-enamel-contact-sheet.webp"

COLS = 10
ROWS = 8
CELL_W = 190
CELL_H = 214
MARGIN = 36
HEADER = 92

sheet = Image.new(
    "RGB",
    (MARGIN * 2 + COLS * CELL_W, MARGIN * 2 + HEADER + ROWS * CELL_H),
    "#080a0a",
)
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=14)
small = ImageFont.load_default(size=11)

draw.text((MARGIN, MARGIN), "THE TAO · 75 ENAMEL TILES", fill="#c7a45a", font=font)
draw.text(
    (MARGIN, MARGIN + 28),
    "Source · Polarity · Five Phases · Eight Trigrams · Living Patterns",
    fill="#9aa59f",
    font=small,
)

for index, card in enumerate(CARDS):
    row, col = divmod(index, COLS)
    x = MARGIN + col * CELL_W
    y = MARGIN + HEADER + row * CELL_H
    number = card["id"][-3:]
    path = ART / f'{number}-{card["slug"]}.webp'
    with Image.open(path) as source:
        tile = source.convert("RGB").resize((174, 174), Image.Resampling.LANCZOS)
    sheet.paste(tile, (x + 8, y + 4))
    label = f'{number}  {card["name"]}'
    draw.text((x + 8, y + 184), label[:26], fill="#d6dacd", font=small)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT, "WEBP", quality=88, method=6)
print(f"Built {OUTPUT.relative_to(ROOT)} with {len(CARDS)} tiles.")
