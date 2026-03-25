# ============================================================================
# 地理卡片信息提取脚本 (parse_continents.py)
# ============================================================================
# 【作用说明】
# 一个简单的数据爬取脚本。遍历读取地理目录下的Markdown文件，使用正则提取出
# “所在洲”、“所属大洲”等字段信息。可用于快速统计和检查现有地理卡片的大洲归属状态。
# ============================================================================

import os
import re

directory = "settings/卡片/地理/"
files = [f for f in os.listdir(directory) if f.endswith(".md")]

continents = set()
file_to_continent = {}

for f in files:
    path = os.path.join(directory, f)
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
        
        # Try to find "所在洲" or "所属大洲" or "所属大陆"
        match = re.search(r'\*\*(?:所在洲|所属洲域|所在大陆|所属大洲)\*\*\s*:\s*\[\[(.*?)\]\]', content)
        if not match:
            match = re.search(r'\*\*(?:所在洲|所属洲域|所在大陆|所属大洲)\*\*\s*:\s*(.*)', content)
            
        if match:
            continent = match.group(1).strip("[] ")
            file_to_continent[f] = continent
            continents.add(continent)
        else:
            # If it's a continent itself, it might not have "所在洲"
            if f in ["中土神洲.md", "东临剑洲.md", "北冥霜洲.md", "南疆瘴洲.md", "西极荒漠.md"]:
                file_to_continent[f] = f.replace(".md", "")
            else:
                file_to_continent[f] = "未分类"

for c in set(file_to_continent.values()):
    print(f"Continent: {c}")

for f, c in file_to_continent.items():
    print(f"{f} -> {c}")
