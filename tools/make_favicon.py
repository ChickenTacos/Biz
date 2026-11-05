"""Packs tools/.favicon-{16,32,48}.png into favicon.ico (needs Pillow)."""
import pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
imgs = [Image.open(root / "tools" / f".favicon-{s}.png").convert("RGBA") for s in (16, 32, 48)]
imgs[2].save(root / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:2])
print("favicon.ico written")
