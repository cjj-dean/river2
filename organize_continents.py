import os
import re
import shutil

directory = "settings/卡片/地理/"
files = [f for f in os.listdir(directory) if f.endswith(".md")]

continents = ["中土神洲", "东临剑洲", "北冥霜洲", "南疆瘴洲", "西极荒漠"]

def get_continent(filepath):
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()
        
    # Check for direct mentions in metadata
    match = re.search(r'\*\*(?:所在洲|所属|所属大洲|所属大陆)\*\*\s*[:：]\s*(?:\[\[)?(.*?)(?:\]\])?$', content, re.MULTILINE)
    if match:
        val = match.group(1).strip()
        for c in continents:
            if c in val:
                return c

    # Check tags
    match = re.search(r'#标签\s*\n(.*)', content)
    if match:
        tags = match.group(1)
        for c in continents:
            if c in tags:
                return c
                
    # Search for continent tags anywhere #continent
    for c in continents:
        if f"#{c}" in content:
            return c
            
    # Search for continent link anywhere [[continent]]
    for c in continents:
        if f"[[{c}]]" in content:
            return c

    # Check if the filename itself is a continent
    for c in continents:
        if c in filepath:
            return c
            
    # As a fallback, try to extract from 出现文件
    match = re.search(r'出现文件\n.*(中土神洲|东临剑洲|北冥霜洲|南疆瘴洲|西极荒漠)', content, re.MULTILINE)
    if match:
        return match.group(1)

    return "其他地理"

moved_count = 0
for f in files:
    path = os.path.join(directory, f)
    continent = get_continent(path)
    
    # Create continent directory
    dest_dir = os.path.join(directory, continent)
    os.makedirs(dest_dir, exist_ok=True)
    
    # Move file
    dest_path = os.path.join(dest_dir, f)
    shutil.move(path, dest_path)
    moved_count += 1
    # print safely ASCII
    print(f"Moved {f.encode('utf-8')} to {continent.encode('utf-8')}")

print(f"Total moved: {moved_count}")
