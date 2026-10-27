import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
w, h = im.size
# central 56% region (the 3D model area), upscale 2x
cw, ch = int(w*0.56), int(h*0.56)
box = ((w-cw)//2, int((h-ch)*0.42), (w+cw)//2, int((h-ch)*0.42)+ch)
c = im.crop(box).resize((cw*2, ch*2), Image.LANCZOS)
c.save(dst)
print(dst, c.size)
