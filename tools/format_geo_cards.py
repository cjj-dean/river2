# ============================================================================
# 地理卡片批量格式化工具 (format_geo_cards.py)
# ============================================================================
# 【作用说明】
# 读取现有的地理Markdown卡片，针对缺失的结构化信息(如地理类型、行政级别、
# 所属父级、坐标、繁荣度等)，使用正则表达式和预定义的字符串模板自动修复、
# 补全卡片元数据。统一整个地理设定图谱的标准格式。
# ============================================================================

import os
import re
import glob

# 预定义的模板部分
MAP_INFO_TEMPLATE = """## 地图信息
- **[[地理类型]]**：{geo_type}
- **[[行政级别]]**：{admin_level}
- **[[所属父级]]**：[[{parent}]]
- **[[相对坐标]]**：{rel_coord}
- **[[相对半径]]**：{rel_radius}
- **[[地理轮廓描述]]**：{shape_desc}
"""

BASIC_INFO_TEMPLATE = """## 基本信息
- **[[繁荣度]]**：{prosperity}
- **类型**：地理
- **面积**：{area}
- **人口**：{population}
- **气候**：{climate}
- **灵脉**：{veins}
"""

def extract_metadata(content):
    metadata = {
        'geo_type': '地域',
        'admin_level': '二级',
        'parent': '未知',
        'rel_coord': '[0%,0%]',
        'rel_radius': '0.1',
        'shape_desc': '不规则多边形',
        'prosperity': '50',
        'area': '未知',
        'population': '未知',
        'climate': '未知',
        'veins': '未知'
    }
    
    lines = content.split('\n')
    basic_info_started = False
    
    for line in lines:
        line = line.strip()
        if line.startswith('## '):
            if '基本信息' in line:
                basic_info_started = True
            elif basic_info_started:
                basic_info_started = False
                
        if basic_info_started and line.startswith('-'):
            # 解析各种可能的键值对
            if '地理类型' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['geo_type'] = (m.group(1) or m.group(2) or '').strip()
            elif '行政级别' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['admin_level'] = (m.group(1) or m.group(2) or '').strip()
            elif '所属父级' in line or '所在洲' in line or '所属' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: 
                    val = (m.group(1) or m.group(2) or '').strip()
                    val = re.sub(r'[\[\]]', '', val) # 移除可能存在的括号
                    metadata['parent'] = val
            elif '相对坐标' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['rel_coord'] = (m.group(1) or m.group(2) or '').strip()
            elif '相对半径' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['rel_radius'] = (m.group(1) or m.group(2) or '').strip()
            elif '繁荣度' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['prosperity'] = (m.group(1) or m.group(2) or '').strip()
            elif '地理轮廓描述' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['shape_desc'] = (m.group(1) or m.group(2) or '').strip()
            elif '面积' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['area'] = (m.group(1) or m.group(2) or '').strip()
            elif '人口' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['population'] = (m.group(1) or m.group(2) or '').strip()
            elif '气候' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['climate'] = (m.group(1) or m.group(2) or '').strip()
            elif '灵脉' in line:
                m = re.search(r'：\s*(.*)$|:\s*(.*)$', line)
                if m: metadata['veins'] = (m.group(1) or m.group(2) or '').strip()
                
    return metadata

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if not content.strip():
        return
        
    # 如果已经包含了地图信息，说明可能已经处理过，跳过
    if '## 地图信息' in content and '## 基本信息' in content:
        # 简单检查一下是否需要更新（如果是北冥霜洲自己，跳过）
        if '北冥霜洲.md' in file_path:
            return

    # 提取标题
    title_match = re.search(r'^#\s+(.*?)$', content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else os.path.basename(file_path).replace('.md', '')
    
    # 提取元数据
    meta = extract_metadata(content)
    
    # 构建新的头部
    new_header = f"# {title}\n\n"
    new_header += MAP_INFO_TEMPLATE.format(**meta) + "\n"
    new_header += BASIC_INFO_TEMPLATE.format(**meta) + "\n"
    
    # 提取剩余内容（详细描述、标签等）
    # 找到最后一个基本信息项之后的空行或下一个标题
    lines = content.split('\n')
    content_start_idx = 0
    basic_info_started = False
    basic_info_ended = False
    
    for i, line in enumerate(lines):
        if line.startswith('## '):
            if '基本信息' in line or '地图信息' in line:
                basic_info_started = True
            elif basic_info_started:
                basic_info_ended = True
                content_start_idx = i
                break
                
    if not basic_info_ended:
        # 如果没有其他标题，就从基本信息后面的非列表行开始
        for i in range(len(lines)):
            if basic_info_started and not lines[i].startswith('-') and not lines[i].startswith('##') and lines[i].strip():
                content_start_idx = i
                break
                
    remaining_content = '\n'.join(lines[content_start_idx:])
    
    # 确保有详细描述标题
    if not remaining_content.strip().startswith('## 详细描述') and not remaining_content.strip().startswith('## 描述'):
        remaining_content = "## 详细描述\n\n" + remaining_content.lstrip()
    else:
        # 统一使用详细描述
        remaining_content = re.sub(r'^## 描述', '## 详细描述', remaining_content.lstrip())
        
    new_content = new_header + remaining_content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Processed: {file_path}")

def main():
    base_dir = "settings/卡片/地理"
    files = glob.glob(f"{base_dir}/**/*.md", recursive=True)
    for file in files:
        process_file(file)

if __name__ == "__main__":
    main()
