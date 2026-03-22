from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import argparse
import hashlib
import json
import math
import random
import re
from datetime import datetime


ROOT = Path(__file__).resolve().parents[1]
GEO_ROOT = ROOT / "settings" / "卡片" / "地理"
WORLD_CENTER = (0.0, 0.0)
WORLD_RADIUS = 1000.0
TOP_PARENT = "扶摇界"
MAINLANDS = ["中土神洲", "东临剑洲", "北冥霜洲", "南疆瘴洲", "西极荒漠"]
MAINLAND_LAYOUT = {
    "中土神洲": (0.0, 0.0),
    "东临剑洲": (58.0, 0.0),
    "西极荒漠": (-58.0, 0.0),
    "北冥霜洲": (0.0, 58.0),
    "南疆瘴洲": (0.0, -58.0),
}
MAINLAND_RADIUS_RATIO = {
    "中土神洲": 0.55,
    "东临剑洲": 0.24,
    "西极荒漠": 0.24,
    "北冥霜洲": 0.24,
    "南疆瘴洲": 0.24,
}


def all_geo_files():
    return sorted(GEO_ROOT.rglob("*.md"))


def stable_hash(text):
    return int(hashlib.md5(text.encode("utf-8")).hexdigest()[:8], 16)


def strip_md(value):
    return value.replace("**", "").replace("[[", "").replace("]]", "").strip()


def strip_link(value):
    m = re.search(r"\[\[([^\]]+)\]\]", value)
    if not m:
        return value.strip()
    raw = m.group(1).strip()
    return raw.split("/")[-1].strip() if "/" in raw else raw


def parse_title(lines, file_path):
    for line in lines:
        if line.startswith("# "):
            return line[2:].strip()
    return file_path.stem


def find_basic_section(lines):
    start = -1
    end = len(lines)
    for i, line in enumerate(lines):
        if line.strip() == "## 基本信息":
            start = i
            break
    if start < 0:
        return -1, -1
    for j in range(start + 1, len(lines)):
        if lines[j].startswith("## "):
            end = j
            break
    return start, end


def parse_metadata(lines, start, end):
    data = {}
    if start < 0:
        return data
    for i in range(start + 1, end):
        line = lines[i].strip()
        if not line:
            continue
        raw = line[1:].strip() if line.startswith("-") else line
        if "：" not in raw and ":" not in raw:
            continue
        parts = re.split(r"：|:", raw, maxsplit=1)
        if len(parts) != 2:
            continue
        key = strip_md(parts[0]).replace(" ", "")
        value = parts[1].split("#")[0].strip()
        if key and value:
            data[key] = value
    return data


def infer_parent(file_path, title, metadata):
    for key in ["所属父级", "所属", "所在洲", "隶属"]:
        if metadata.get(key):
            return strip_link(metadata[key])
    rel = file_path.relative_to(GEO_ROOT)
    parts = rel.parts
    if len(parts) == 1:
        return TOP_PARENT
    folder = parts[0]
    if folder == "其他地理" or folder == title:
        return TOP_PARENT
    return folder


def infer_type(title, metadata):
    raw = metadata.get("地理类型") or metadata.get("类型") or ""
    if raw and raw not in ["地理", "地点"]:
        return strip_md(raw)
    if title.endswith("洲") or title.endswith("荒漠"):
        return "大陆"
    if "港" in title:
        return "港口城市"
    if title.endswith("城") or title.endswith("镇"):
        return "城市"
    if title.endswith("山") or title.endswith("峰") or title.endswith("崖"):
        return "山地"
    if title.endswith("谷"):
        return "工坊城"
    if title.endswith("海"):
        return "海域"
    if title.endswith("岛"):
        return "岛屿"
    return "地域"


def parse_number(value):
    if not value:
        return None
    digits = re.sub(r"[^\d\.-]", "", str(value))
    if not digits:
        return None
    try:
        return float(digits)
    except ValueError:
        return None


def parse_relative_coord(value):
    if not value:
        return None
    m = re.search(r"\[\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%\s*\]", value)
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def parse_abs_coord(value):
    if not value:
        return None
    m = re.search(r"\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]", value)
    if m and "%" not in value:
        return float(m.group(1)), float(m.group(2))
    m2 = re.search(r"\{\s*x\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*y\s*:\s*(-?\d+(?:\.\d+)?)\s*\}", value)
    if m2:
        return float(m2.group(1)), float(m2.group(2))
    return None


def parse_relative_radius(value):
    if not value:
        return None
    if "%" in value:
        n = parse_number(value)
        return None if n is None else n / 100
    n = parse_number(value)
    return None if n is None else n


def infer_prosperity(geo_type, metadata):
    existing = parse_number(metadata.get("繁荣度") or metadata.get("繁华度") or metadata.get("富庶度"))
    if existing is not None:
        return int(max(0, min(100, round(existing))))
    defaults = {"大陆": 70, "港口城市": 76, "城市": 72, "主城": 88, "工坊城": 73, "禁地": 18, "险地": 28, "山地": 46, "海域": 50, "岛屿": 56, "地域": 60}
    return defaults.get(geo_type, 60)


def default_relative_radius(node):
    if node["parent"] == TOP_PARENT and node["name"] in MAINLAND_RADIUS_RATIO:
        return MAINLAND_RADIUS_RATIO[node["name"]]
    t = node["type"]
    if "大陆" in t:
        return 0.18
    if "海" in t:
        return 0.22
    if "城市" in t or "城" in t or "港" in t:
        return 0.13
    if "禁地" in t or "险地" in t:
        return 0.11
    return 0.14


def default_relative_coord(node):
    if node["parent"] == TOP_PARENT and node["name"] in MAINLAND_LAYOUT:
        return MAINLAND_LAYOUT[node["name"]]
    h = stable_hash(node["name"])
    angle = math.radians(h % 360)
    dist = 22 + (h % 36)
    return round(math.cos(angle) * dist, 2), round(math.sin(angle) * dist, 2)


def build_circle_boundary(cx, cy, radius, points=40):
    boundary = []
    for i in range(points):
        a = (2 * math.pi * i) / points
        boundary.append([round(cx + math.cos(a) * radius, 2), round(cy + math.sin(a) * radius, 2)])
    return boundary


def build_cards():
    cards = []
    for file_path in all_geo_files():
        text = file_path.read_text(encoding="utf-8")
        lines = text.splitlines()
        title = parse_title(lines, file_path)
        start, end = find_basic_section(lines)
        metadata = parse_metadata(lines, start, end)
        node = {
            "id": title,
            "name": title,
            "file_path": file_path,
            "lines": lines,
            "start": start,
            "end": end,
            "metadata": metadata,
            "parent": infer_parent(file_path, title, metadata),
            "type": infer_type(title, metadata),
            "prosperity": infer_prosperity(infer_type(title, metadata), metadata),
            "relCoordRaw": metadata.get("相对坐标") or metadata.get("坐标体系") or "",
            "relRadiusRaw": metadata.get("相对半径") or "",
        }
        cards.append(node)
    return cards


def solve_layout(nodes):
    by_name = {n["name"]: n for n in nodes}
    for n in nodes:
        n["children"] = []
    for n in nodes:
        p = by_name.get(n["parent"])
        if p:
            p["children"].append(n)

    top_level = []
    for n in nodes:
        if n["parent"] == TOP_PARENT or n["parent"] not in by_name:
            n["parent"] = TOP_PARENT
            top_level.append(n)

    mainland_abs = {
        "中土神洲": (0.0, 0.0),
        "东临剑洲": (950.0, 0.0),
        "西极荒漠": (-950.0, 0.0),
        "北冥霜洲": (0.0, -900.0),
        "南疆瘴洲": (0.0, 900.0),
    }
    mainland_radius = {
        "中土神洲": 620.0,
        "东临剑洲": 260.0,
        "西极荒漠": 260.0,
        "北冥霜洲": 260.0,
        "南疆瘴洲": 260.0,
    }

    outer_nodes = [n for n in top_level if n["name"] not in mainland_abs]
    for idx, n in enumerate(sorted(outer_nodes, key=lambda x: x["name"])):
        angle = (2 * math.pi * idx) / max(1, len(outer_nodes))
        n["x"] = round(math.cos(angle) * 1550.0, 2)
        n["y"] = round(math.sin(angle) * 1550.0, 2)
        n["radius"] = 45.0
    for n in top_level:
        if n["name"] in mainland_abs:
            n["x"], n["y"] = mainland_abs[n["name"]]
            n["radius"] = mainland_radius[n["name"]]

    queue = top_level[:]
    seen = set()
    while queue:
        parent = queue.pop(0)
        if parent["name"] in seen:
            continue
        seen.add(parent["name"])
        children = sorted(parent["children"], key=lambda x: x["name"])
        if not children:
            continue
        queue.extend(children)
        pr = parent["radius"]
        if len(children) == 1:
            c = children[0]
            c["radius"] = round(pr * 0.92, 2)
            c["x"] = parent["x"]
            c["y"] = parent["y"]
            continue
        rng = random.Random(stable_hash(parent["name"]))
        center_index = stable_hash(parent["name"] + "#center") % len(children)
        center_child = children[center_index]
        others = [c for i, c in enumerate(children) if i != center_index]
        k = len(children)
        base_ratio = min(0.38, 0.95 / math.sqrt(k + 2))
        base_r = max(1.0, pr * base_ratio)
        center_r = max(1.0, base_r / 1.45)
        center_child["x"] = parent["x"]
        center_child["y"] = parent["y"]
        center_child["radius"] = round(center_r, 2)
        if not others:
            continue
        outer_r = base_r
        placed = False
        gap = 1.2
        for _ in range(24):
            positions = []
            failed = False
            for child in others:
                ok = False
                for _ in range(260):
                    angle = rng.random() * 2 * math.pi
                    max_d = max(0.0, pr - outer_r - gap)
                    d = math.sqrt(rng.random()) * max_d
                    x = parent["x"] + math.cos(angle) * d
                    y = parent["y"] + math.sin(angle) * d
                    if math.hypot(x - parent["x"], y - parent["y"]) + outer_r > pr - 1e-6:
                        continue
                    if math.hypot(x - center_child["x"], y - center_child["y"]) < outer_r + center_r + gap:
                        continue
                    bad = False
                    for px, py in positions:
                        if math.hypot(x - px, y - py) < outer_r + outer_r + gap:
                            bad = True
                            break
                    if bad:
                        continue
                    positions.append((x, y))
                    ok = True
                    break
                if not ok:
                    failed = True
                    break
            if not failed:
                for child, (x, y) in zip(others, positions):
                    child["radius"] = round(outer_r, 2)
                    child["x"] = round(x, 2)
                    child["y"] = round(y, 2)
                placed = True
                break
            outer_r *= 0.92
            center_r = max(1.0, outer_r / 1.45)
            center_child["radius"] = round(center_r, 2)
        if not placed:
            m = len(others)
            ring_d = max(center_r + outer_r + gap, pr - outer_r - gap)
            ring_d = min(ring_d, pr - outer_r - gap)
            base_angle = math.radians(stable_hash(parent["name"]) % 360)
            for i, child in enumerate(others):
                a = base_angle + (2 * math.pi * i) / m
                child["radius"] = round(outer_r, 2)
                child["x"] = round(parent["x"] + math.cos(a) * ring_d, 2)
                child["y"] = round(parent["y"] + math.sin(a) * ring_d, 2)

    sibling_groups = {}
    for n in nodes:
        sibling_groups.setdefault(n["parent"], []).append(n)
    for parent_name, siblings in sibling_groups.items():
        if parent_name == TOP_PARENT or len(siblings) < 2:
            continue
        max_r = max(node["radius"] for node in siblings)
        min_r = min(node["radius"] for node in siblings)
        if min_r <= 0:
            continue
        if (max_r * max_r) / (min_r * min_r) >= 2.0:
            continue
        target_min_r = max_r / math.sqrt(2.05)
        smallest = min(siblings, key=lambda x: x["radius"])
        smallest["radius"] = round(min(target_min_r, smallest["radius"]), 2)

    for n in nodes:
        p = by_name.get(n["parent"])
        parent_radius = WORLD_RADIUS if not p else p["radius"]
        n["relRadius"] = max(0.0001, n["radius"] / parent_radius)
        n["relCoord"] = ((n["x"] - (WORLD_CENTER[0] if not p else p["x"])) / parent_radius * 100, ((WORLD_CENTER[1] if not p else p["y"]) - n["y"]) / parent_radius * 100)
        n["boundaryRadius"] = round(n["radius"], 2)
        n["boundary"] = build_circle_boundary(n["x"], n["y"], n["radius"])

    return nodes


def extract_links(content):
    links = []
    for m in re.finditer(r"\[\[([^\]]+)\]\]", content):
        raw = m.group(1).strip()
        links.append(raw.split("/")[-1].strip() if "/" in raw else raw)
    return sorted(set(links))


def format_pct(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return f"{s}%"


def format_ratio(v):
    return f"{v:.4f}".rstrip("0").rstrip(".")


def rewrite_basic_info(node):
    lines = node["lines"][:]
    start, end = node["start"], node["end"]
    if start < 0:
        insert_at = 1 if lines else 0
        lines[insert_at:insert_at] = ["", "## 基本信息", ""]
        start, end = find_basic_section(lines)

    existing = lines[start + 1:end]
    filtered = []
    drop_keys = {"地理类型", "行政级别", "所属父级", "相对坐标", "繁荣度", "相对半径"}
    for line in existing:
        raw = line[1:].strip() if line.strip().startswith("-") else line.strip()
        if "：" not in raw and ":" not in raw:
            filtered.append(line)
            continue
        parts = re.split(r"：|:", raw, maxsplit=1)
        k = strip_md(parts[0]).replace(" ", "")
        if k in drop_keys:
            continue
        filtered.append(line)

    admin = "一级" if node["parent"] == TOP_PARENT else "二级"
    x_pct, y_pct = node["relCoord"]
    canon = [
        f"- **[[地理类型]]**：{node['type']}",
        f"- **[[行政级别]]**：{admin}",
        f"- **所属父级**：[[{node['parent']}]]",
        f"- **[[相对坐标]]**：[{format_pct(x_pct)},{format_pct(y_pct)}]",
        f"- **[[相对半径]]**：{format_ratio(node['relRadius'])}",
        f"- **[[繁荣度]]**：{node['prosperity']}",
    ]
    lines[start + 1:end] = canon + filtered
    text = "\n".join(lines)
    node["file_path"].write_text(text + ("\n" if not text.endswith("\n") else ""), encoding="utf-8")


def build_geo_data():
    nodes = build_cards()
    solve_layout(nodes)
    by_name = {n["name"]: n for n in nodes}
    edges = []
    edge_set = set()

    depth_cache = {}

    def depth_of(name):
        if name in depth_cache:
            return depth_cache[name]
        node = by_name.get(name)
        if not node:
            return 1
        parent = node.get("parent")
        if not parent or parent not in by_name:
            depth_cache[name] = 1
            return 1
        d = depth_of(parent) + 1
        depth_cache[name] = d
        return d

    for n in nodes:
        content = n["file_path"].read_text(encoding="utf-8")
        links = extract_links(content)
        if n["parent"] in by_name:
            k = f"{n['parent']}->{n['name']}"
            if k not in edge_set:
                edge_set.add(k)
                edges.append({"source": n["parent"], "target": n["name"], "kind": "parent"})
        for link in links:
            if link not in by_name or link == n["name"]:
                continue
            a, b = sorted([n["name"], link])
            k = f"{a}<->{b}"
            if k in edge_set:
                continue
            edge_set.add(k)
            edges.append({"source": n["name"], "target": link, "kind": "reference"})

    api_nodes = []
    for n in nodes:
        api_nodes.append({
            "id": n["name"],
            "name": n["name"],
            "type": n["type"],
            "parent": n["parent"],
            "prosperity": n["prosperity"],
            "x": round(n["x"], 2),
            "y": round(n["y"], 2),
            "radius": round(n["radius"], 2),
            "boundaryRadius": n["boundaryRadius"],
            "boundary": n["boundary"],
            "relativeCoord": [round(n["relCoord"][0], 4), round(n["relCoord"][1], 4)],
            "relativeRadius": round(n["relRadius"], 6),
            "levelDepth": depth_of(n["name"]),
            "relativePath": n["file_path"].relative_to(GEO_ROOT).as_posix(),
        })

    return {
        "generatedAt": datetime.now().isoformat(),
        "source": "settings/卡片/地理",
        "nodeCount": len(api_nodes),
        "edgeCount": len(edges),
        "nodes": api_nodes,
        "edges": edges,
    }


def validate():
    errors = []
    required = ["地理类型", "行政级别", "所属父级", "相对坐标", "相对半径", "繁荣度"]
    for file_path in all_geo_files():
        lines = file_path.read_text(encoding="utf-8").splitlines()
        start, end = find_basic_section(lines)
        if start < 0:
            errors.append(f"{file_path}: 缺少 ## 基本信息")
            continue
        data = parse_metadata(lines, start, end)
        for key in required:
            if key not in data:
                errors.append(f"{file_path}: 缺少字段 {key}")
        if parse_relative_coord(data.get("相对坐标", "")) is None:
            errors.append(f"{file_path}: 相对坐标必须是百分比格式，如 [10%,10%]")
        rr = parse_relative_radius(data.get("相对半径", ""))
        if rr is None or rr <= 0:
            errors.append(f"{file_path}: 相对半径非法")

    graph = build_geo_data()
    by_name = {n["name"]: n for n in graph["nodes"]}
    grouped = {}
    for n in graph["nodes"]:
        grouped.setdefault(n["parent"], []).append(n)

    for siblings in grouped.values():
        for i in range(len(siblings)):
            for j in range(i + 1, len(siblings)):
                a = siblings[i]
                b = siblings[j]
                d = math.hypot(a["x"] - b["x"], a["y"] - b["y"])
                if d + 1e-5 < a["radius"] + b["radius"]:
                    errors.append(f"{a['name']} 与 {b['name']}: 兄弟圆形边界重叠")

    for parent_name, siblings in grouped.items():
        if parent_name == TOP_PARENT or len(siblings) < 2:
            continue
        areas = [math.pi * (node["radius"] ** 2) for node in siblings]
        max_area = max(areas)
        min_area = min(areas)
        if min_area > 0 and max_area / min_area < 2 - 1e-6:
            errors.append(f"{parent_name}: 兄弟节点最大面积未超过最小面积2倍")

    for n in graph["nodes"]:
        p = by_name.get(n["parent"])
        if not p:
            continue
        d = math.hypot(n["x"] - p["x"], n["y"] - p["y"])
        if d + n["radius"] > p["radius"] + 1e-4:
            errors.append(f"{n['name']}: 超出父节点边界 {n['parent']}")

    for parent_name, siblings in grouped.items():
        if parent_name not in by_name or not siblings:
            continue
        parent = by_name[parent_name]
        child_area = sum(math.pi * (node["radius"] ** 2) for node in siblings)
        parent_area = math.pi * (parent["radius"] ** 2)
        if parent_area > 0 and child_area / parent_area < 0.12:
            errors.append(f"{parent_name}: 子节点面积占比不足12%")

    if all(name in by_name for name in MAINLANDS):
        top_level = [n for n in graph["nodes"] if n["parent"] == TOP_PARENT]
        mainland_area = sum(math.pi * (by_name[name]["radius"] ** 2) for name in MAINLANDS)
        world_area = sum(math.pi * (n["radius"] ** 2) for n in top_level)
        if world_area > 0 and mainland_area / world_area < 0.9:
            errors.append("五大陆面积占比不足90%")
        zhongtu_area = math.pi * (by_name["中土神洲"]["radius"] ** 2)
        if world_area > 0 and zhongtu_area / world_area < 0.4:
            errors.append("中土神洲面积占比不足40%")
        largest = max(graph["nodes"], key=lambda n: n["radius"])["name"]
        if largest != "中土神洲":
            errors.append("中土神洲不是最大区域")
        c = by_name["中土神洲"]
        e = by_name["东临剑洲"]
        w = by_name["西极荒漠"]
        n = by_name["北冥霜洲"]
        s = by_name["南疆瘴洲"]
        if not (e["x"] > c["x"] > w["x"]):
            errors.append("大陆方位错误：东西不正确")
        if not (n["y"] < c["y"] < s["y"]):
            errors.append("大陆方位错误：南北不正确")
    return errors


HTML = """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>地理地图</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0b1020;color:#e5e7eb}
header{padding:12px 16px;border-bottom:1px solid #24324b;display:flex;justify-content:space-between;align-items:center}
#meta{font-size:12px;color:#9ca3af}
#legend{position:fixed;top:68px;right:14px;background:rgba(8,15,33,.86);border:1px solid #24324b;border-radius:8px;padding:8px 10px;font-size:12px;color:#cbd5e1;line-height:1.45}
#canvas{width:100vw;height:calc(100vh - 56px)}svg{width:100%;height:100%}
.e1{stroke:#60a5fa;stroke-width:1.5;opacity:.7}.e2{stroke:#94a3b8;stroke-width:1;opacity:.35;stroke-dasharray:4 3}
</style></head><body>
<header><div>地理地图</div><div id="meta"></div></header>
<div id="legend">层级图例<br/>一级：粗边+大字<br/>二级：中边+中字<br/>三级及以下：细边+小字</div>
<div id="canvas"><svg id="svg" viewBox="-1700 -1300 3400 2600"><g id="regions"></g><g id="edges"></g><g id="nodes"></g></svg></div>
<script>
let g={nodes:[],edges:[]},s='';
const siblingColorMap=new Map();
function h(k){let x=0;for(let i=0;i<k.length;i++){x=((x*131)+k.charCodeAt(i))>>>0}return x}
function c(x){const key=x.parent||x.name||"__root__";if(siblingColorMap.has(key))return siblingColorMap.get(key);const hue=h(key)%360;const col=`hsl(${hue} 76% 58%)`;siblingColorMap.set(key,col);return col}
function lv(x){const d=x.levelDepth||2; if(d<=1)return {sw:2.8,fo:.16,so:.95,nr:12,fs:15,dx:14,w:'700'}; if(d===2)return {sw:1.8,fo:.10,so:.7,nr:8,fs:12,dx:10,w:'500'}; return {sw:1.1,fo:.07,so:.5,nr:6,fs:10,dx:8,w:'400'};}
function draw(){const r=document.getElementById("regions"),e=document.getElementById("edges"),n=document.getElementById("nodes");r.innerHTML="";e.innerHTML="";n.innerHTML="";const m=new Map(g.nodes.map(i=>[i.id,i]));
g.nodes.forEach(x=>{const st=lv(x);const color=c(x);const p=document.createElementNS("http://www.w3.org/2000/svg","polygon");p.setAttribute("points",(x.boundary||[]).map(k=>k[0]+","+k[1]).join(" "));p.setAttribute("fill",color);p.setAttribute("fill-opacity",String(st.fo));p.setAttribute("stroke",color);p.setAttribute("stroke-opacity",String(st.so));p.setAttribute("stroke-width",String(st.sw));r.appendChild(p);});
g.edges.forEach(x=>{const a=m.get(x.source),b=m.get(x.target);if(!a||!b)return;const l=document.createElementNS("http://www.w3.org/2000/svg","line");l.setAttribute("x1",a.x);l.setAttribute("y1",a.y);l.setAttribute("x2",b.x);l.setAttribute("y2",b.y);l.setAttribute("class",x.kind==="parent"?"e1":"e2");e.appendChild(l)});
g.nodes.forEach(x=>{const st=lv(x);const color=c(x);const gg=document.createElementNS("http://www.w3.org/2000/svg","g");const p=document.createElementNS("http://www.w3.org/2000/svg","circle");p.setAttribute("cx",x.x);p.setAttribute("cy",x.y);p.setAttribute("r",String(st.nr));p.setAttribute("fill",color);p.setAttribute("stroke","#0f172a");p.setAttribute("stroke-width","1.1");const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",x.x+st.dx);t.setAttribute("y",x.y+4);t.setAttribute("font-size",String(st.fs));t.setAttribute("font-weight",st.w);t.setAttribute("fill","#e5e7eb");t.textContent=x.name;gg.appendChild(p);gg.appendChild(t);n.appendChild(gg);});}
async function refresh(){const r=await fetch("/api/geo-data",{cache:"no-store"});const d=await r.json();g=d;document.getElementById("meta").textContent=`节点 ${d.nodeCount} | 关系 ${d.edgeCount} | 更新时间 ${new Date(d.generatedAt).toLocaleString()}`;draw();s=d.generatedAt}
setInterval(async()=>{const r=await fetch("/api/geo-data",{cache:"no-store"});const d=await r.json();if(d.generatedAt!==s){g=d;document.getElementById("meta").textContent=`节点 ${d.nodeCount} | 关系 ${d.edgeCount} | 更新时间 ${new Date(d.generatedAt).toLocaleString()}`;draw();s=d.generatedAt}},2000);
refresh();
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        p = urlparse(self.path).path
        if p == "/":
            body = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if p == "/api/geo-data":
            payload = json.dumps(build_geo_data(), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_):
        return


def cmd_normalize():
    nodes = build_cards()
    solve_layout(nodes)
    for node in nodes:
        rewrite_basic_info(node)


def cmd_validate():
    errors = validate()
    if errors:
        for e in errors:
            print(e)
        raise SystemExit(1)
    print("OK")


def cmd_serve(port):
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"http://127.0.0.1:{port}/")
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("normalize")
    sub.add_parser("validate")
    s = sub.add_parser("serve")
    s.add_argument("--port", type=int, default=4177)
    args = parser.parse_args()
    if args.cmd == "normalize":
        cmd_normalize()
        return
    if args.cmd == "validate":
        cmd_validate()
        return
    if args.cmd == "serve":
        cmd_serve(args.port)


if __name__ == "__main__":
    main()
