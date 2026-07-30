import os
import sys
import uuid
import shutil
import logging
from pathlib import Path

import ezdxf
from ezdxf.addons import odafc
from ezdxf.addons.drawing import Frontend, RenderContext
from ezdxf.addons.drawing import svg as svg_backend
from ezdxf.addons.drawing import layout

from entity_extractor import extract_entities

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

IS_WINDOWS = sys.platform == "win32"


def _setup_oda():
    """Configure ODA File Converter path and Qt platform for current OS."""
    if IS_WINDOWS:
        oda_dir = r"C:\Program Files\ODA\ODAFileConverter 27.1.0"
        if oda_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] += os.pathsep + oda_dir
            logger.info(f"Added ODA to PATH: {oda_dir}")
    else:
        # Linux / macOS: expect ODA_EXEC_PATH env var or default location
        oda_path = os.environ.get(
            "ODA_EXEC_PATH",
            "/opt/ODAFileConverter/bin/ODAFileConverter"
        )
        if os.path.isfile(oda_path):
            ezdxf.options.set("odafc-addon", "unix_exec_path", oda_path)
            logger.info(f"ODA configured at: {oda_path}")
        # Force xcb platform for headless operation
        if "QT_QPA_PLATFORM" not in os.environ:
            os.environ["QT_QPA_PLATFORM"] = "xcb"


def process_upload(file_path: str) -> dict:
    _setup_oda()
    file_path = Path(file_path)
    drawing_id = str(uuid.uuid4())
    work_dir = UPLOAD_DIR / drawing_id
    work_dir.mkdir(exist_ok=True)

    dwg_path = work_dir / file_path.name
    shutil.copy2(str(file_path), str(dwg_path))

    is_dwg = dwg_path.suffix.lower() == ".dwg"

    if is_dwg and odafc.is_installed():
        if IS_WINDOWS:
            # Windows: convert via odafc CLI, then read back
            dxf_path = work_dir / f"{file_path.stem}.dxf"
            odafc.convert(str(dwg_path), str(dxf_path))
            doc = ezdxf.readfile(str(dxf_path))
        else:
            # Linux: readfile directly handles conversion in-memory
            doc = odafc.readfile(str(dwg_path))
    elif not is_dwg:
        doc = ezdxf.readfile(str(dwg_path))
    else:
        raise RuntimeError(
            "ODA File Converter is not installed. "
            "Upload DXF files directly, or install ODA File Converter."
        )

    data = extract_entities(doc)

    data["drawing_id"] = drawing_id
    data["filename"] = file_path.name
    data["is_dwg"] = is_dwg
    data["dxf_version"] = doc.dxfversion
    data["work_dir"] = str(work_dir)

    svg_path = work_dir / "preview.svg"
    _generate_svg(doc, str(svg_path))
    data["svg_path"] = str(svg_path)

    return data


def _generate_svg(doc: ezdxf.document.Drawing, output_path: str):
    msp = doc.modelspace()
    backend = svg_backend.SVGBackend()
    context = RenderContext(doc)
    frontend = Frontend(context, backend)
    frontend.draw_layout(msp, finalize=True)

    page = layout.Page(0, 0, layout.Units.mm, margins=layout.Margins.all(10))
    svg_string = backend.get_string(page)

    with open(output_path, "wt", encoding="utf-8") as f:
        f.write(svg_string)


def get_drawing_data(drawing_id: str) -> dict | None:
    work_dir = UPLOAD_DIR / drawing_id
    if not work_dir.exists():
        return None

    dxf_files = list(work_dir.glob("*.dxf"))
    if not dxf_files:
        return None

    doc = ezdxf.readfile(str(dxf_files[0]))
    data = extract_entities(doc)
    data["drawing_id"] = drawing_id
    data["filename"] = dxf_files[0].name
    data["dxf_version"] = doc.dxfversion
    data["work_dir"] = str(work_dir)
    return data


def get_svg_path(drawing_id: str) -> str | None:
    work_dir = UPLOAD_DIR / drawing_id
    svg_path = work_dir / "preview.svg"
    if svg_path.exists():
        return str(svg_path)
    return None


def cleanup(drawing_id: str):
    work_dir = UPLOAD_DIR / drawing_id
    if work_dir.exists():
        shutil.rmtree(str(work_dir))
