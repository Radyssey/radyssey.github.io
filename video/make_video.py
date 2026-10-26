"""Render the Radyssey launch video from launch_video.html.

Each frame is drawn by renderAt(t) in headless Chromium (Playwright), screenshotted,
and piped straight into ffmpeg (H.264 + a silent AAC track), so no frames touch the disk.

Run from anywhere, with the project venv:
  C:\\venvs\\RadLearn_Blog\\Scripts\\python.exe -I video\\make_video.py
  ... --formats vertical --url radyssey.github.io --stills 4,10,17,24,30,37,42
Options:
  --formats   vertical, square or both (default both)
  --url       the address shown on the closing card
  --fps       frames per second (default 30)
  --stills    comma-separated times in seconds; saves PNGs to video/stills/ and skips the encode
For a new lesson, copy launch_video.html, change the scenes, and pass --page.
"""
import argparse
import pathlib
import subprocess
import sys
import urllib.parse

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
FORMATS = {"vertical": (1080, 1920), "square": (1080, 1080)}


def page_url(page, w, h, url, name):
    q = urllib.parse.urlencode({"w": w, "h": h, "url": url, "name": name})
    return page.as_uri() + "?" + q


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--formats", default="vertical,square")
    ap.add_argument("--url", default="radyssey.github.io")
    ap.add_argument("--name", default="Radyssey")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--page", default=str(HERE / "launch_video.html"))
    ap.add_argument("--stills", default="")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    page_path = pathlib.Path(a.page).resolve()
    out_dir = HERE / ("stills" if a.stills else "out")
    out_dir.mkdir(exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fmt in a.formats.split(","):
            w, h = FORMATS[fmt]
            pg = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg.goto(page_url(page_path, w, h, a.url, a.name))
            pg.wait_for_function("window.READY === true")
            pg.evaluate("document.fonts.ready")
            duration = pg.evaluate("window.DURATION")

            if a.stills:
                for s in a.stills.split(","):
                    pg.evaluate(f"renderAt({float(s)})")
                    pg.screenshot(path=str(out_dir / f"{fmt}_{float(s):05.1f}s.png"))
                print(f"{fmt}: stills saved to {out_dir}")
                pg.close()
                continue

            out = out_dir / f"{a.name.replace(' ', '')}_launch_{fmt}.mp4"
            cmd = [ffmpeg, "-y", "-loglevel", "error",
                   "-f", "image2pipe", "-framerate", str(a.fps), "-c:v", "png", "-i", "-",
                   "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                   "-map", "0:v", "-map", "1:a", "-shortest",
                   "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-profile:v", "high",
                   "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "32k",
                   "-movflags", "+faststart", str(out)]
            enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            n = int(round(duration * a.fps))
            for i in range(n):
                pg.evaluate(f"renderAt({i / a.fps})")
                enc.stdin.write(pg.screenshot(type="png"))
                if i % (a.fps * 5) == 0:
                    print(f"{fmt}: {i / a.fps:4.0f}s / {duration}s", flush=True)
            enc.stdin.close()
            if enc.wait() != 0:
                sys.exit(f"ffmpeg failed for {fmt}")
            print(f"{fmt}: {out} ({out.stat().st_size / 1e6:.1f} MB)")
            pg.close()
        browser.close()


if __name__ == "__main__":
    main()
