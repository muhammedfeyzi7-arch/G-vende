"""
Rehber ve Acil Durum fotoğraf görselleri: kullanıcının sağladığı kolajdan (source/collage.png, 1536×1024)
kırpılır.  Çalıştırma: python3 design/guide-art/photos.py  → assets/guide/art/*.jpg

Kolaj 5×4 karodan oluşur; her karo yalnızca ~300×230 piksel. Bu yüzden çıktılar 2× (Lanczos)
büyütülür; telefonda büyük alanlarda yumuşak görünebilir. Karoların tek tek yüksek çözünürlüklü
sürümleri gelince TILES yerine doğrudan o dosyalar kullanılmalı.

İçerik kontrolü (rehber metniyle çelişmemesi için):
- gaz: karodaki vana kolu boruya paralel (= AÇIK) ve yanında yeşil onay var; "vanayı kapatın"
  maddesiyle çeliştiği için kol ve onay işareti kırpılarak dışarıda bırakıldı.
- tekerlekli sandalye: "hareket et" anlamına gelen yeşil ok kırpıldı (konu: tekerlekleri kilitleyin).
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = Image.open(ROOT / 'design/guide-art/source/collage.png').convert('RGB')
OUT = ROOT / 'assets/guide/art'

# Karo kutuları (kolaj koordinatı, kenar boşluğu ve köşe yuvarlaması dışarıda)
ROWS = [(8, 248), (276, 508), (535, 740), (766, 990)]
COLS = [
    [(8, 328), (357, 608), (636, 932), (960, 1229), (1256, 1528)],
    [(8, 317), (346, 608), (636, 932), (960, 1229), (1256, 1528)],
    [(8, 317), (346, 608), (636, 932), (960, 1229), (1256, 1528)],
    [(8, 317), (346, 608), (636, 899), (926, 1229), (1256, 1528)],
]
NAMES = [
    ['dch', 'home', 'kit', 'family', 'furniture'],
    ['after', 'trapped', 'outdoor', 'vehicle', 'transit'],
    ['special', 'checklist', 'gas', 'wheelchair', 'exit'],
    ['siren', 'phone-alert', 'beacon', 'chat', 'backpack'],
]
TILES = {}
for r, (y0, y1) in enumerate(ROWS):
    for c, (x0, x1) in enumerate(COLS[r]):
        TILES[NAMES[r][c]] = SRC.crop((x0, y0, x1, y1))

# İkinci kolaj (source/collage2.png, 1448×1086, 2×2; karo ~720×540): Çök-Kapan-Tutun, gaz, çanta,
# tekerlekli sandalye yakın çekim.
# - gaz2: vana yine dikey boru üzerinde ve kol boruya paralel (= AÇIK) + onay işareti → vana ve onay
#   kullanılmadı, yalnızca sayaç ve "ateş yakmayın" işareti.
# - sandalye yakın çekimi kullanılmadı: frenin kilitli olduğu anlaşılmıyor, el tekerleği itiyor gibi.
SRC2 = Image.open(ROOT / 'design/guide-art/source/collage2.png').convert('RGB')
TILES['dch2'] = SRC2.crop((0, 0, 722, 540))
TILES['gas2'] = SRC2.crop((726, 0, 1448, 540))
TILES['kit2'] = SRC2.crop((0, 546, 722, 1086))

# çıktı adı → (karo, karo içi kutu ya da None = tamamı)
CROPS = {
    'drop-cover-hold': ('dch2', None),
    'drop-cover-hold-hero': ('dch2', (40, 100, 640, 540)),
    'drop-cover-hold-wide': ('dch2', (0, 170, 722, 531)),
    'home-safety': ('home', None),
    'kit': ('kit2', None),
    'family-plan': ('family', None),
    'furniture': ('furniture', None),
    'after-quake': ('after', None),
    'after-quake-wide': ('after', (0, 30, 309, 184)),
    'trapped': ('trapped', None),
    'trapped-wide': ('trapped', (0, 60, 262, 191)),
    'outdoor': ('outdoor', None),
    'outdoor-wide': ('outdoor', (0, 64, 296, 212)),
    'vehicle': ('vehicle', None),
    'vehicle-wide': ('vehicle', (0, 62, 269, 196)),
    'transit': ('transit', None),
    'transit-wide': ('transit', (0, 40, 272, 176)),
    'special-needs': ('special', None),
    'checklist': ('checklist', None),
    # vana kolu ve onay işareti dışarıda: yalnızca sayaç + "ateş yakmayın"
    'gas': ('gas2', (474, 40, 722, 420), 4 / 3),
    'gas-wide': ('gas2', (474, 40, 722, 420), 2),
    # yeşil ok dışarıda
    'wheelchair': ('wheelchair', (0, 0, 269, 152)),
    'wheelchair-wide': ('wheelchair', (0, 10, 269, 144)),
    # Acil Durum araç kartları ve çanta
    'tool-siren': ('siren', None),
    'tool-light': ('beacon', None),
    'tool-sms': ('chat', None),
    'tool-assembly': ('after', (176, 6, 309, 120)),
    'backpack': ('backpack', None),
}



def fill(im, ratio):
    """Dar kırpımı kesmeden istenen orana getirir: arkada aynı görüntünün bulanık, koyulaştırılmış hali."""
    h = im.height
    w = round(h * ratio)
    k = max(w / im.width, h / im.height)
    bg = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    bg = bg.crop(((bg.width - w) // 2, (bg.height - h) // 2, (bg.width - w) // 2 + w, (bg.height - h) // 2 + h))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(12))).enhance(0.55)
    bg.paste(im, ((w - im.width) // 2, 0))
    return bg


for name, (tile, box, *ratio) in CROPS.items():
    im = TILES[tile] if box is None else TILES[tile].crop(box)
    if ratio:
        im = fill(im, ratio[0])
    if im.width < 600:  # ilk kolajın küçük karoları
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    im.save(OUT / f'{name}.jpg', quality=88, optimize=True)
    print(name, im.size)
