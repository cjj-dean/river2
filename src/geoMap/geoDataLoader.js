import fs from 'fs/promises';
import path from 'path';

const GEO_ROOT = path.join(process.cwd(), 'settings', '卡片', '地理');

function stripLink(value) {
  if (!value) {
    return '';
  }
  const match = value.match(/\[\[([^\]]+)\]\]/);
  if (!match) {
    return value.trim();
  }
  const raw = match[1].trim();
  if (!raw.includes('/')) {
    return raw;
  }
  const parts = raw.split('/');
  return parts[parts.length - 1].trim();
}

function normalizeKey(value) {
  return value
    .replace(/\[\[|\]\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/：/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function parseCoordinate(value) {
  if (!value) {
    return null;
  }
  const simple = value.match(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/);
  if (simple) {
    return { x: Number(simple[1]), y: Number(simple[2]) };
  }
  const struct = value.match(/\{\s*x\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*y\s*:\s*(-?\d+(?:\.\d+)?)\s*\}/);
  if (struct) {
    return { x: Number(struct[1]), y: Number(struct[2]) };
  }
  return null;
}

function inferParentFromPath(relativePath, title) {
  const segments = relativePath.split('/');
  if (segments.length < 2) {
    return null;
  }
  const folderName = segments[0];
  if (!folderName || folderName === title) {
    return null;
  }
  return folderName;
}

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseCard(filePath, content) {
  const relativePath = path.relative(GEO_ROOT, filePath).replaceAll(path.sep, '/');
  const lines = content.split('\n');
  const titleLine = lines.find(line => line.trim().startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : path.basename(filePath, '.md');

  const metadata = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-') && !trimmed.includes('：') && !trimmed.includes(':')) {
      continue;
    }
    const cleaned = trimmed.replace(/^-+\s*/, '');
    const parts = cleaned.split(/：|:/);
    if (parts.length < 2) {
      continue;
    }
    const rawKey = parts[0];
    const rawValue = parts.slice(1).join('：').split('#')[0];
    const key = normalizeKey(rawKey);
    const value = rawValue.trim();
    if (key && value) {
      metadata[key] = value;
    }
  }

  const linkPattern = /\[\[([^\]]+)\]\]/g;
  const links = [];
  const seen = new Set();
  for (const match of content.matchAll(linkPattern)) {
    const raw = match[1].trim();
    const nodeName = raw.includes('/') ? raw.split('/').pop().trim() : raw;
    if (!seen.has(nodeName)) {
      seen.add(nodeName);
      links.push(nodeName);
    }
  }

  const coordinate = parseCoordinate(metadata.相对坐标 || metadata.坐标体系);
  const parent = stripLink(
    metadata.所属父级
    || metadata.所属
    || metadata.所在洲
    || metadata.隶属
    || inferParentFromPath(relativePath, title)
    || ''
  );
  const type = metadata.地理类型 || metadata.类型 || '未分类';
  const prosperityValue = metadata.繁荣度 || metadata.富庶度 || metadata.繁华度 || '';
  const prosperity = Number(String(prosperityValue).replace(/[^\d.-]/g, '')) || null;

  return {
    id: title,
    name: title,
    type,
    parent: parent || null,
    prosperity,
    coordinate,
    relativePath,
    metadata,
    links,
  };
}

function computeLayout(cards) {
  const positioned = new Map();
  const grouped = new Map();

  for (const card of cards) {
    if (card.coordinate) {
      positioned.set(card.id, { ...card.coordinate, isManual: true });
      continue;
    }
    const group = card.relativePath.split('/')[0] || '根目录';
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group).push(card);
  }

  const groupNames = [...grouped.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  const groupWidth = 240;
  const rowHeight = 130;

  groupNames.forEach((groupName, groupIndex) => {
    const cardsInGroup = grouped.get(groupName).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    cardsInGroup.forEach((card, index) => {
      const column = groupIndex % 6;
      const band = Math.floor(groupIndex / 6);
      const x = -620 + column * groupWidth + (index % 2) * 85;
      const y = -300 + band * 420 + index * rowHeight;
      positioned.set(card.id, { x, y, isManual: false });
    });
  });

  const childrenByParent = new Map();
  for (const card of cards) {
    if (!card.parent) {
      continue;
    }
    if (!childrenByParent.has(card.parent)) {
      childrenByParent.set(card.parent, []);
    }
    childrenByParent.get(card.parent).push(card.id);
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const parentPosition = positioned.get(parentId);
    if (!parentPosition) {
      continue;
    }
    children.forEach((childId, index) => {
      const childPosition = positioned.get(childId);
      if (!childPosition || childPosition.isManual) {
        return;
      }
      const angle = (Math.PI * 2 * index) / Math.max(children.length, 1);
      const radius = 150 + Math.floor(index / 6) * 35;
      childPosition.x = parentPosition.x + Math.cos(angle) * radius;
      childPosition.y = parentPosition.y + Math.sin(angle) * radius;
    });
  }

  return positioned;
}

export async function buildGeoData() {
  const files = await collectMarkdownFiles(GEO_ROOT);
  const cards = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    cards.push(parseCard(filePath, content));
  }

  const allNames = new Set(cards.map(card => card.name));
  const layout = computeLayout(cards);

  const nodes = cards.map(card => {
    const position = layout.get(card.id) || { x: 0, y: 0, isManual: false };
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      parent: card.parent,
      prosperity: card.prosperity,
      x: position.x,
      y: position.y,
      isManual: position.isManual,
      relativePath: card.relativePath,
    };
  });

  const edgeSet = new Set();
  const edges = [];

  for (const card of cards) {
    if (card.parent && allNames.has(card.parent)) {
      const key = `${card.parent}->${card.name}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: card.parent, target: card.name, kind: 'parent' });
      }
    }
    for (const link of card.links) {
      if (!allNames.has(link) || link === card.name) {
        continue;
      }
      const normalized = [card.name, link].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).join('<->');
      if (edgeSet.has(normalized)) {
        continue;
      }
      edgeSet.add(normalized);
      edges.push({ source: card.name, target: link, kind: 'reference' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'settings/卡片/地理',
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
  };
}

export function getGeoRootDir() {
  return GEO_ROOT;
}
