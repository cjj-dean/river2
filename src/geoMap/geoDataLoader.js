import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const GEO_ROOT = path.join(process.cwd(), 'settings', '卡片', '地理');

export async function buildGeoData() {
  const pythonScript = path.join(process.cwd(), 'tools', 'geo_map_tool.py');
  const pythonCode = `import sys
import json
sys.path.insert(0, '${process.cwd().replace(/\\/g, '/')}')
import tools.geo_map_tool as g
data = g.build_geo_data()
for n in data['nodes']:
    try:
        n['content'] = (g.GEO_ROOT / n['relativePath']).read_text(encoding='utf-8')
    except Exception as e:
        n['content'] = '无法读取文件内容'
print(json.dumps(data))`;

  const scriptPath = path.join(process.cwd(), '.temp_geo_loader.py');
  await fs.writeFile(scriptPath, pythonCode, 'utf-8');
  
  try {
    const { stdout } = await execAsync(`python "${scriptPath}"`, { maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } finally {
    try {
      await fs.unlink(scriptPath);
    } catch (e) {}
  }
}

export function getGeoRootDir() {
  return GEO_ROOT;
}
