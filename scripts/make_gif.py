import os
import sys
from PIL import Image, ImageSequence

input_path = r"C:\Users\alexander\.gemini\antigravity-ide\brain\7006d6fa-8ab7-4f0e-9b15-0e137533e49e\protolens_superpowers_test_1790183267561.webp"
output_path = r"B:\workgit\protolens\docs\images\protolens_demo.gif"

if not os.path.exists(input_path):
    print("Input webp not found:", input_path)
    sys.exit(1)

print(f"Opening {input_path}...")
im = Image.open(input_path)
n_frames = getattr(im, "n_frames", 1)
print(f"Source has {n_frames} frames, size: {im.size}")

step = max(1, n_frames // 80)
sampled_frames = []

target_width = 850
aspect = im.size[1] / im.size[0]
target_height = int(target_width * aspect)
target_size = (target_width, target_height)

for idx, frame in enumerate(ImageSequence.Iterator(im)):
    if idx % step == 0:
        rgb_frame = frame.convert("RGB").resize(target_size, Image.Resampling.LANCZOS)
        p_frame = rgb_frame.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        sampled_frames.append(p_frame)

print(f"Extracted and quantized {len(sampled_frames)} frames. Saving GIF to {output_path}...")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

sampled_frames[0].save(
    output_path,
    save_all=True,
    append_images=sampled_frames[1:],
    optimize=True,
    duration=100,
    loop=0
)

file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Done! Saved {output_path} ({file_size_mb:.2f} MB)")
