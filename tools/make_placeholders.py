#!/usr/bin/env python3
"""
Genere des skins de TEST (64x64, format classique, theme Noel) pour que le
site soit utilisable tout de suite. A remplacer par les vraies creations :
il suffit de deposer un PNG 64x64 avec le meme nom de fichier.

Chaque fichier est un skin COMPLET 64x64 : le site ne decoupe que la zone de
la categorie concernee (voir ZONES dans js/skin-model.js).

Usage : python3 tools/make_placeholders.py
"""
import os
import random
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "skins")
T = (0, 0, 0, 0)


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


RED, DRED = hx("#c62f2f"), hx("#8f1d1d")
GREEN, DGREEN = hx("#2f8f4e"), hx("#1d5e33")
WHITE, SNOW = hx("#f4f7fb"), hx("#dbe6f3")
BLACK, GOLD, BROWN = hx("#1d1d22"), hx("#e3b72a"), hx("#6b4226")
SKIN, SKIN2 = hx("#e0a982"), hx("#c98d66")
BLUE, ICE = hx("#4a86c7"), hx("#a9d1f2")


class Skin:
    def __init__(self, seed=1):
        self.img = Image.new("RGBA", (64, 64), T)
        self.rnd = random.Random(seed)

    def px(self, x, y, c):
        self.img.putpixel((x, y), c)

    def rect(self, x, y, w, h, c, noise=0.04):
        for j in range(y, y + h):
            for i in range(x, x + w):
                if c == T or noise == 0:
                    self.px(i, j, c)
                else:
                    self.px(i, j, shade(c, 1 + self.rnd.uniform(-noise, noise)))

    def save(self, cat, name):
        folder = os.path.join(ROOT, cat)
        os.makedirs(folder, exist_ok=True)
        self.img.save(os.path.join(folder, name + ".png"))


def faces(u, v, w, h, d):
    """Rectangles (x, y, w, h) des 6 faces d'un pave au format Minecraft."""
    return {
        "top": (u + d, v, w, d),
        "bottom": (u + d + w, v, w, d),
        "right": (u, v + d, d, h),
        "front": (u + d, v + d, w, h),
        "left": (u + d + w, v + d, d, h),
        "back": (u + 2 * d + w, v + d, w, h),
    }


SIDES = ("right", "front", "left", "back")


def paint_box(s, spec, row, top, bottom=None):
    """row(r, x, side) -> couleur pour la ligne r (0 = haut) de chaque face laterale."""
    f = faces(*spec)
    s.rect(*f["top"], top)
    s.rect(*f["bottom"], bottom or shade(top, 0.8))
    for side in SIDES:
        x0, y0, w, h = f[side]
        for r in range(h):
            for x in range(w):
                c = row(r, x, side)
                s.px(x0 + x, y0 + r, T if c == T else shade(c, 1 + s.rnd.uniform(-0.04, 0.04)))


# ============================================================== TETES
def head(s, skin=SKIN, hair=None, face=True, eyes=None, mouth=True):
    def row(r, x, side):
        if hair and (side == "back" or r < 2 or (side in ("right", "left") and r < 4)):
            return hair
        return skin
    paint_box(s, (0, 0, 8, 8, 8), row, hair or skin, skin)
    if face:
        e = eyes or hx("#2a2a5a")
        for ex in (9, 13):
            s.px(ex, 12, WHITE)
            s.px(ex + 1, 12, e)
        if mouth:
            s.px(11, 14, shade(skin, 0.6))
            s.px(12, 14, shade(skin, 0.6))


def hat_layer(s, color, trim=None, pompom=None, rows=3):
    def row(r, x, side):
        if r < rows - 1 or (trim is None and r < rows):
            return color
        if r == rows - 1 and trim:
            return trim
        return T
    paint_box(s, (32, 0, 8, 8, 8), row, color, T)
    if pompom:
        s.px(43, 3, pompom); s.px(44, 3, pompom); s.px(43, 4, pompom); s.px(44, 4, pompom)


def make_heads():
    s = Skin(1)
    head(s, hair=hx("#5a3a22"))
    hat_layer(s, RED, WHITE, WHITE)
    s.save("tete", "bonnet-rouge")

    s = Skin(2)
    head(s, hair=hx("#e6c565"))
    hat_layer(s, GREEN, RED, GOLD, rows=3)
    for x in (8, 15):  # joues rouges
        s.px(x if x == 8 else 14, 13, hx("#e58a7a"))
    s.save("tete", "elfe")

    s = Skin(3)
    head(s, skin=WHITE, face=False)
    s.px(9, 11, BLACK); s.px(10, 11, BLACK); s.px(13, 11, BLACK); s.px(14, 11, BLACK)
    s.px(11, 13, hx("#f08a24")); s.px(12, 13, hx("#f08a24")); s.px(11, 14, hx("#f08a24")); s.px(12, 14, hx("#f08a24"))
    for x in (9, 10, 13, 14):
        s.px(x, 15, BLACK)
    hat_layer(s, BLACK, None, None, rows=3)
    s.save("tete", "bonhomme-neige")

    s = Skin(4)
    head(s, skin=hx("#8a5a34"), mouth=False)
    s.rect(11, 13, 2, 2, hx("#e22b2b"), noise=0)  # nez rouge
    # bois : pixels sur la couche externe (dessus + hauts des cotes)
    ant = hx("#d9c9a3")
    for (x, y) in ((42, 1), (42, 2), (41, 2), (45, 1), (45, 2), (46, 2)):
        s.px(x, y, ant)
    for (x, y) in ((34, 8), (34, 9), (35, 9), (50, 8), (50, 9), (51, 9)):
        s.px(x, y, ant)
    s.save("tete", "renne")

    s = Skin(5)
    head(s, hair=WHITE)
    # barbe : bas du visage et des cotes
    f = faces(0, 0, 8, 8, 8)
    for side in ("right", "front", "left"):
        x0, y0, w, h = f[side]
        s.rect(x0, y0 + 5, w, 3, WHITE)
    x0, y0, w, h = f["front"]
    s.rect(x0 + 2, y0 + 5, 4, 1, WHITE)
    s.px(x0 + 3, y0 + 6, hx("#b86a5a")); s.px(x0 + 4, y0 + 6, hx("#b86a5a"))
    hat_layer(s, RED, WHITE, WHITE)
    s.save("tete", "pere-noel")


# ============================================================== HAUTS
BODY = (16, 16, 8, 12, 4)


def body(s, row, top):
    paint_box(s, BODY, row, top)


def make_tops():
    # pull moche : rouge, frise verte/blanche et sapin
    s = Skin(11)
    def row(r, x, side):
        if r in (2, 3):
            return GREEN if (x + r) % 2 == 0 else WHITE
        return RED
    body(s, row, RED)
    fx, fy, fw, fh = faces(*BODY)["front"]
    for i, w in enumerate((1, 3, 5, 3, 5, 7)):
        s.rect(fx + 4 - w // 2 - (0 if w % 2 else 0), fy + 5 + i, w, 1, GREEN)
    s.px(fx + 4, fy + 4, GOLD)
    s.rect(fx + 3, fy + 11 - 0, 2, 1, BROWN)
    s.save("haut", "pull-moche")

    # manteau rouge : galons blancs + ceinture noire
    s = Skin(12)
    def row(r, x, side):
        if r in (7, 8):
            return BLACK
        return RED
    body(s, row, WHITE)
    fx, fy, fw, fh = faces(*BODY)["front"]
    s.rect(fx + 3, fy, 2, 12, WHITE)
    s.rect(fx + 3, fy + 7, 2, 2, GOLD, noise=0)
    s.px(fx + 3, fy + 8, BLACK); s.px(fx + 4, fy + 8, BLACK)
    s.rect(fx, fy, 8, 1, WHITE)
    s.save("haut", "manteau-rouge")

    # veste d'elfe : verte, col rouge, boutons dores
    s = Skin(13)
    def row(r, x, side):
        if r == 0:
            return RED
        if r in (8, 9):
            return BROWN
        return GREEN
    body(s, row, RED)
    fx, fy, fw, fh = faces(*BODY)["front"]
    for r in (2, 4, 6):
        s.px(fx + 3, fy + r, GOLD); s.px(fx + 4, fy + r, GOLD)
    s.rect(fx + 3, fy + 8, 2, 2, GOLD, noise=0)
    # petits triangles de zigzag en bas
    for x in range(0, 8, 2):
        s.px(fx + x, fy + 11, RED)
    s.save("haut", "veste-elfe")

    # pull bleu givre : flocons
    s = Skin(14)
    body(s, lambda r, x, side: BLUE if r < 10 else ICE, BLUE)
    fx, fy, fw, fh = faces(*BODY)["front"]
    for (cx, cy) in ((2, 3), (5, 6), (2, 9), (6, 2)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= cx + dx < 8:
                s.px(fx + cx + dx, fy + cy + dy, WHITE)
    s.save("haut", "pull-bleu")


# =============================================================== BRAS
ARM_R = (40, 16, 4, 12, 4)
ARM_L = (32, 48, 4, 12, 4)
SLEEVE_R = (40, 32, 4, 12, 4)
SLEEVE_L = (48, 48, 4, 12, 4)


def arms(s, rowfn, top):
    for spec in (ARM_R, ARM_L):
        paint_box(s, spec, rowfn, top, SKIN)


def make_arms():
    def sleeve(color, cuff=WHITE, hand=SKIN, cuff_row=9):
        def row(r, x, side):
            if r < cuff_row:
                return color
            if r == cuff_row:
                return cuff
            return hand
        return row

    s = Skin(21)
    arms(s, sleeve(RED), RED)
    s.save("bras", "manches-rouges")

    s = Skin(22)
    arms(s, sleeve(GREEN, cuff=GOLD), GREEN)
    s.save("bras", "manches-vertes")

    s = Skin(23)
    arms(s, lambda r, x, side: (RED if (r // 2) % 2 == 0 else WHITE) if r < 10 else SKIN, RED)
    s.save("bras", "manches-rayees")

    # moufles : manches grises + grosses moufles rouges + manche externe (couche 2)
    s = Skin(24)
    def row(r, x, side):
        if r < 8:
            return hx("#5b6b7a")
        if r == 8:
            return WHITE
        return RED
    arms(s, row, hx("#5b6b7a"))
    for spec in (SLEEVE_R, SLEEVE_L):
        def over(r, x, side):
            return hx("#d94a4a") if r >= 9 else T
        paint_box(s, spec, over, T, T)
    s.save("bras", "moufles")


# ================================================================ BAS
LEG_R = (0, 16, 4, 12, 4)
LEG_L = (16, 48, 4, 12, 4)


def legs(s, rowfn, top):
    for spec in (LEG_R, LEG_L):
        paint_box(s, spec, rowfn, top)


def make_legs():
    def pants(color, cuff=None, boots=BLACK):
        def row(r, x, side):
            if r >= 10:
                return boots
            if cuff and r == 9:
                return cuff
            return color
        return row

    s = Skin(31)
    legs(s, pants(RED, WHITE), RED)
    s.save("bas", "pantalon-rouge")

    s = Skin(32)
    legs(s, pants(hx("#26262b"), None, BROWN), hx("#26262b"))
    s.save("bas", "pantalon-noir")

    s = Skin(33)
    def tights(r, x, side):
        if r >= 10:
            return GOLD if r == 10 else BROWN
        return GREEN if (r // 2) % 2 == 0 else RED
    legs(s, tights, GREEN)
    s.save("bas", "collant-elfe")

    s = Skin(34)
    def jean(r, x, side):
        if r >= 10:
            return SNOW if (x + r) % 3 else WHITE
        if r == 9:
            return WHITE
        return hx("#2f4f8f")
    legs(s, jean, hx("#2f4f8f"))
    s.save("bas", "jean-neige")


if __name__ == "__main__":
    make_heads()
    make_tops()
    make_arms()
    make_legs()
    print("Skins de test generes dans", os.path.normpath(ROOT))
