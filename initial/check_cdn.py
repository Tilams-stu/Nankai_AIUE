import requests

urls = [
    "https://cdn.bootcdn.net/ajax/libs/model-viewer/3.4.0/model-viewer.min.js",
    "https://lib.baomitu.com/model-viewer/3.4.0/model-viewer.min.js",
    "https://cdn.staticfile.org/model-viewer/3.4.0/model-viewer.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
]

for url in urls:
    print(f"Checking {url}...")
    try:
        resp = requests.head(url, timeout=3)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Found working URL!")
            break
    except Exception as e:
        print(f"Error: {e}")
