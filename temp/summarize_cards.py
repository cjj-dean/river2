import os
import re

def extract_section(content, section_name):
    pattern = rf"##\s+{section_name}\s*\n(.*?)(?=\n## |\Z)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""

def process_cards():
    categories = ["特殊概念", "势力", "地理", "境界", "货币", "人物", "功法", "法宝"]
    summary = {}
    for cat in categories:
        summary[cat] = []
        
    for root, dirs, files in os.walk("settings/卡片"):
        for file in files:
            if not file.endswith(".md"):
                continue
            path = os.path.join(root, file)
            # determine category from path
            cat_match = None
            for cat in categories:
                if f"/{cat}/" in path.replace("\\", "/"):
                    cat_match = cat
                    break
            
            if not cat_match:
                continue
                
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                
            title_match = re.search(r"^#\s+(.*)", content)
            title = title_match.group(1).strip() if title_match else file.replace(".md", "")
            
            # extract basic info or description
            basic_info = extract_section(content, "基本信息")
            details = extract_section(content, "详细描述")
            
            if cat_match in ["特殊概念", "势力", "地理", "境界", "货币"]:
                summary[cat_match].append(f"【{title}】\n{basic_info}\n{details}")
            else:
                # For characters, techniques, artifacts just keep it very brief
                desc = details[:150] + "..." if len(details) > 150 else details
                summary[cat_match].append(f"【{title}】 {desc}".replace("\n", " "))
                
    with open("cards_summary.txt", "w", encoding="utf-8") as f:
        for cat in categories:
            f.write(f"=== {cat} ===\n\n")
            f.write("\n\n".join(summary[cat]))
            f.write("\n\n" + "="*40 + "\n\n")

process_cards()
