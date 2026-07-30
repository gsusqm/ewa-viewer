import ezdxf
import numpy as np
from typing import Any
from ezdxf.entities import DXFEntity


def _to_native(val: Any) -> Any:
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    if isinstance(val, tuple):
        return tuple(_to_native(v) for v in val)
    return val


def _round(val: Any, decimals: int = 4) -> float:
    return float(round(float(_to_native(val)), decimals))


def _pair(x: Any, y: Any) -> tuple[float, float]:
    return (_round(x), _round(y))


def _resolve_aci(color: int) -> int:
    if color <= 0 or color >= 256:
        return 7
    return int(color)


def _get_color(entity: DXFEntity, doc: ezdxf.document.Drawing) -> int:
    color = entity.dxf.color
    if color < 0 or color == 256:
        layer_name = entity.dxf.layer
        if layer_name in doc.layers:
            return _resolve_aci(int(doc.layers.get(layer_name).dxf.color))
    return _resolve_aci(int(color))


def polyline_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    points = [(_round(p[0]), _round(p[1])) for p in entity.get_points()]
    return {
        "type": "LWPOLYLINE",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "closed": bool(entity.closed),
        "points": points,
    }


def line_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    return {
        "type": "LINE",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "start": _pair(entity.dxf.start.x, entity.dxf.start.y),
        "end": _pair(entity.dxf.end.x, entity.dxf.end.y),
    }


def arc_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    return {
        "type": "ARC",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "center": _pair(entity.dxf.center.x, entity.dxf.center.y),
        "radius": _round(entity.dxf.radius),
        "start_angle": _round(entity.dxf.start_angle, 2),
        "end_angle": _round(entity.dxf.end_angle, 2),
    }


def circle_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    return {
        "type": "CIRCLE",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "center": _pair(entity.dxf.center.x, entity.dxf.center.y),
        "radius": _round(entity.dxf.radius),
    }


def text_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    text = entity.dxf.text if hasattr(entity.dxf, "text") else ""
    return {
        "type": "TEXT",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "text": str(text).replace("\n", " ").strip(),
        "insert": _pair(entity.dxf.insert.x, entity.dxf.insert.y),
        "height": float(round(entity.dxf.height, 2)) if hasattr(entity.dxf, "height") else 0,
        "rotation": float(round(entity.dxf.rotation, 2)) if hasattr(entity.dxf, "rotation") else 0,
    }


def mtext_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    text = entity.text if hasattr(entity, "text") else ""
    return {
        "type": "MTEXT",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "text": str(text).replace("\n", "\\n").strip(),
        "insert": _pair(entity.dxf.insert.x, entity.dxf.insert.y),
        "height": float(round(entity.dxf.char_height, 2)) if hasattr(entity.dxf, "char_height") else 0,
        "rotation": float(round(entity.dxf.rotation, 2)) if hasattr(entity.dxf, "rotation") else 0,
        "width": float(round(entity.dxf.width, 2)) if hasattr(entity.dxf, "width") else 0,
    }


def insert_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    block_name = entity.dxf.name if hasattr(entity.dxf, "name") else "?"
    return {
        "type": "INSERT",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "block": str(block_name),
        "insert": _pair(entity.dxf.insert.x, entity.dxf.insert.y),
        "scale": (
            float(round(entity.dxf.xscale, 4)),
            float(round(entity.dxf.yscale, 4)),
        ),
        "rotation": float(round(entity.dxf.rotation, 2)) if hasattr(entity.dxf, "rotation") else 0,
    }


def leader_to_dict(entity: DXFEntity, doc: ezdxf.document.Drawing) -> dict[str, Any]:
    return {
        "type": "MULTILEADER",
        "layer": entity.dxf.layer,
        "color": _get_color(entity, doc),
        "style_name": str(entity.dxf.style_name) if hasattr(entity.dxf, "style_name") else "",
    }


ENTITY_HANDLERS = {
    "LWPOLYLINE": polyline_to_dict,
    "POLYLINE": polyline_to_dict,
    "LINE": line_to_dict,
    "ARC": arc_to_dict,
    "CIRCLE": circle_to_dict,
    "TEXT": text_to_dict,
    "MTEXT": mtext_to_dict,
    "INSERT": insert_to_dict,
    "MULTILEADER": leader_to_dict,
    "POINT": lambda e, d: {
        "type": "POINT",
        "layer": e.dxf.layer,
        "color": _get_color(e, d),
        "location": _pair(e.dxf.location.x, e.dxf.location.y),
    },
}


def extract_entities(doc: ezdxf.document.Drawing) -> dict[str, Any]:
    msp = doc.modelspace()
    layers_info = []
    entities_by_layer: dict[str, list[dict[str, Any]]] = {}
    extents = {"xmin": float("inf"), "xmax": float("-inf"), "ymin": float("inf"), "ymax": float("-inf")}

    for layer in doc.layers:
        raw_color = _resolve_aci(int(layer.dxf.color))
        try:
            r, g, b = ezdxf.colors.aci2rgb(raw_color)
            rgb_str = f"#{r:02x}{g:02x}{b:02x}"
        except Exception:
            rgb_str = "#c8c8c8"
        layers_info.append({
            "name": layer.dxf.name,
            "color": raw_color,
            "rgb": rgb_str,
            "linetype": layer.dxf.linetype,
            "locked": bool(layer.dxf.flags & 1),
            "on": not bool(layer.dxf.flags & 2),
            "entity_count": 0,
        })

    for entity in msp:
        handler = ENTITY_HANDLERS.get(entity.dxftype())
        if handler is None:
            continue
        try:
            data = handler(entity, doc)
            layer_name = data["layer"]
            if layer_name not in entities_by_layer:
                entities_by_layer[layer_name] = []
            entities_by_layer[layer_name].append(data)
            coords = _get_coords(data)
            for x, y in coords:
                if x < extents["xmin"]:
                    extents["xmin"] = x
                if x > extents["xmax"]:
                    extents["xmax"] = x
                if y < extents["ymin"]:
                    extents["ymin"] = y
                if y > extents["ymax"]:
                    extents["ymax"] = y
        except Exception:
            pass

    for layer in layers_info:
        layer["entity_count"] = len(entities_by_layer.get(layer["name"], []))

    if extents["xmin"] == float("inf"):
        extents = {"xmin": 0.0, "xmax": 1000.0, "ymin": 0.0, "ymax": 1000.0}
    else:
        extents = {
            "xmin": _to_native(extents["xmin"]),
            "xmax": _to_native(extents["xmax"]),
            "ymin": _to_native(extents["ymin"]),
            "ymax": _to_native(extents["ymax"]),
        }

    return {
        "layers": layers_info,
        "entities": entities_by_layer,
        "extents": extents,
        "total_entities": sum(len(v) for v in entities_by_layer.values()),
    }


def _get_coords(data: dict[str, Any]) -> list[tuple[float, float]]:
    t = data["type"]
    if t in ("TEXT", "MTEXT", "INSERT", "POINT"):
        return [data["insert"] if "insert" in data else data.get("location", (0, 0))]
    if t in ("LINE",):
        return [data["start"], data["end"]]
    if t in ("CIRCLE", "ARC"):
        c = data["center"]
        r = data.get("radius", 0)
        return [(c[0] - r, c[1] - r), (c[0] + r, c[1] + r)]
    if t in ("LWPOLYLINE",):
        return data.get("points", [])
    return []
