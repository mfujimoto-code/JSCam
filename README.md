# JSCam

Live camera image-processing bench in the browser. Grayscale, edges, histogram, and frame-delta modes run on the capture stream. Sources are static files in `jscam/` (no bundler).

## Use

Open **https://mfujimoto-code.github.io/JSCam** over HTTPS, allow the camera, then **Start camera**.

Tap the image to hide or show controls. Implementation version is at the bottom of Controls.

The camera API needs a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): this Pages URL, or localhost.

## Local

```bash
docker compose up -d
```

Then open `http://127.0.0.1:8888/` or `https://localhost:8888/` (self-signed cert). Plain HTTP on a LAN IP will not start the camera.
