// Парсер md с маркерами [image: ...] и [music: ...]
export function parseWorkMd(md, meta) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Картинка
    const imageMatch = line.match(/^\[image: (.+)\]$/i);
    if (imageMatch) {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
      }
      blocks.push({ type: 'image', imageFile: imageMatch[1].trim() });
      continue;
    }
    // Музыка
    const musicMatch = line.match(/^\[music: ([^\],]+)(?:,\s*radius=([0-9.]+))?\]$/i);
    if (musicMatch) {
      if (buffer.length) {
        blocks.push({ type: 'text', content: buffer.join('\n') });
        buffer = [];
      }
      blocks.push({
        type: 'music',
        musicFile: musicMatch[1].trim(),
        radius: musicMatch[2] ? parseFloat(musicMatch[2]) : undefined
      });
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length) {
    blocks.push({ type: 'text', content: buffer.join('\n') });
  }
  return {
    ...meta,
    blocks,
    text: md,
  };
} 