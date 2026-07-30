import os
import sys
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).parent))
from dxf_processor import process_upload, get_drawing_data, get_svg_path, cleanup

app = FastAPI(title="EWA DWG Viewer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "python": sys.version}

@app.get("/debug")
def debug():
    import ezdxf
    from ezdxf.addons import odafc
    info = {
        "oda_exec_path_env": os.environ.get("ODA_EXEC_PATH", "NOT SET"),
        "qt_platform": os.environ.get("QT_QPA_PLATFORM", "NOT SET"),
        "oda_path_exists": os.path.isfile(os.environ.get("ODA_EXEC_PATH", "/opt/ODAFileConverter/bin/ODAFileConverter")),
        "oda_dir_exists": os.path.isdir("/opt/ODAFileConverter"),
        "oda_bin_exists": os.path.isdir("/opt/ODAFileConverter/bin"),
        "oda_files": [],
        "ezdxf_oda_option": ezdxf.options.get("odafc-addon", "unix_exec_path"),
        "odafc_is_installed": odafc.is_installed(),
    }
    bin_dir = "/opt/ODAFileConverter/bin"
    if os.path.isdir(bin_dir):
        info["oda_files"] = os.listdir(bin_dir)
    lib_dir = "/opt/ODAFileConverter/lib"
    if os.path.isdir(lib_dir):
        info["oda_lib_files"] = [f for f in os.listdir(lib_dir) if "Qt" in f or "icu" in f][:10]
    return info


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".dwg", ".dxf"):
        raise HTTPException(400, f"Unsupported format: {ext}. Only .dwg and .dxf are supported.")

    temp_path = Path(__file__).parent / "_temp_upload" / file.filename
    temp_path.parent.mkdir(exist_ok=True)

    try:
        content = await file.read()
        temp_path.write_bytes(content)

        data = process_upload(str(temp_path))
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")
    finally:
        if temp_path.exists():
            temp_path.unlink()
        parent = temp_path.parent
        if parent.exists() and not list(parent.iterdir()):
            parent.rmdir()


@app.get("/api/drawing/{drawing_id}")
def get_drawing(drawing_id: str):
    data = get_drawing_data(drawing_id)
    if data is None:
        raise HTTPException(404, "Drawing not found")
    return JSONResponse(content=data)


@app.get("/api/drawing/{drawing_id}/svg")
def get_svg(drawing_id: str):
    svg_path = get_svg_path(drawing_id)
    if svg_path is None:
        raise HTTPException(404, "SVG not found")
    return FileResponse(svg_path, media_type="image/svg+xml")


@app.get("/api/drawing/{drawing_id}/layers")
def get_layers(drawing_id: str):
    data = get_drawing_data(drawing_id)
    if data is None:
        raise HTTPException(404, "Drawing not found")
    return JSONResponse(content={"layers": data["layers"]})


@app.delete("/api/drawing/{drawing_id}")
def delete_drawing(drawing_id: str):
    cleanup(drawing_id)
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn
    import logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="info")
