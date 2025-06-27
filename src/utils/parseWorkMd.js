// Парсер md с маркерами [image: ...], [audio: ...], [music ... start], [music ... end]
export function parseWorkMd(md, meta) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  let musicZones = [];
  let musicStack = [];
  let lineToBlockIdx = {};
  let currentBlockIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Картинка
    const imageMatch = line.match(/^[\[]image: (.+)\]$/i);
    if (imageMatch) {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
        currentBlockIdx++;
      }
      blocks.push({ type: 'image', imageFile: imageMatch[1].trim() });
      currentBlockIdx++;
      continue;
    }
    // Музыкальная зона: [music track_name start] ... [music track_name end]
    const musicStart = line.match(/^[\[]music ([^\s\]]+) start\]$/i);
    const musicEnd = line.match(/^[\[]music ([^\s\]]+) end\]$/i);
    if (musicStart) {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
        currentBlockIdx++;
      }
      musicStack.push({ track: musicStart[1], startBlock: currentBlockIdx });
      continue;
    }
    if (musicEnd && musicStack.length) {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
        currentBlockIdx++;
      }
      const last = musicStack.pop();
      let endBlock = currentBlockIdx - 1;
      if (endBlock < last.startBlock) {
        blocks.push({ type: 'text', content: '' });
        endBlock = currentBlockIdx++;
      }
      musicZones.push({
        type: 'music-zone',
        track: last.track,
        startBlock: last.startBlock,
        endBlock
      });
      continue;
    }
    // --- Новый код: разбиваем по абзацам ---
    if (line === '') {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
        currentBlockIdx++;
      }
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length) {
    blocks.push({ type: 'text', content: buffer.join('\n') });
    currentBlockIdx++;
  }
  // Вставляем зоны в meta
  return {
    ...meta,
    blocks,
    musicZones,
    text: md,
  };
} 