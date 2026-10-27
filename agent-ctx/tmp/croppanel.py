import sys, json
from PIL import Image
src, dst, rect_json = sys.argv[1], sys.argv[2], sys.argv[3]
r = rect_json.strip()
if r.startswith('"'):
    r = json.loads(r)
r = json.loads(r) if isinstance(r, str) else r
im = Image.open(src)
box = (int(r['x']), max(0, int(r['y'])), int(r['x']+r['width']), min(im.height, int(r['y']+r['height'])))
c = im.crop(box)
c = c.resize((c.width*2, c.height*2), Image.LANCZOS)
c.save(dst)
print(dst, c.size, box)
