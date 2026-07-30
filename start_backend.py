"""Start the EWA Viewer backend server."""
import subprocess, time, os, sys, requests, atexit, socket

os.environ["PATH"] += os.pathsep + r"C:\Program Files\ODA\ODAFileConverter 27.1.0"

# Kill any process on port 8001 using a different approach
try:
    import urllib.request
    urllib.request.urlopen("http://127.0.0.1:8002/health", timeout=1)
    print("[WARN] Port 8001 already in use, continuing anyway")
except:
    pass

# Start backend
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
proc = subprocess.Popen(
    [sys.executable, "main.py"],
    cwd=backend_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
atexit.register(lambda: proc.kill())

# Wait for it
url = "http://127.0.0.1:8002"
for i in range(20):
    try:
        r = requests.get(f"{url}/health", timeout=2)
        if r.status_code == 200:
            print(f"[OK] Backend ready at {url}")
            break
    except:
        time.sleep(1)
else:
    print("[FAIL] Backend did not start")
    sys.exit(1)

# Test with our DWG file
dwg = os.path.join(os.path.dirname(__file__), "LMSP011_REPLANTEADO AL 4 DE JULIO.dwg")
with open(dwg, "rb") as f:
    r = requests.post(f"{url}/api/upload", files={"file": ("test.dwg", f)}, timeout=120)
    d = r.json()
    print(f"[OK] Upload test passed!")
    print(f"     Drawing ID: {d['drawing_id']}")
    print(f"     Entities: {d['total_entities']}")
    print(f"     Layers: {len(d['layers'])}")

print("\n" + "=" * 50)
print("BACKEND RUNNING at http://127.0.0.1:8001")
print("Close this window to stop the server.")
print("=" * 50 + "\n")

print("\nServer stdout:")
print(proc.stdout.read().decode("utf-8", errors="replace"))
print("\nServer stderr:")
print(proc.stderr.read().decode("utf-8", errors="replace"))
