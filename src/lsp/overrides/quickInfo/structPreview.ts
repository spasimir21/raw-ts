import { StructDescriptor } from '../../../types';

function getStructPreview(descriptor: StructDescriptor): string {
  if (Object.keys(descriptor.fieldDescriptors).length === 0) return '';

  const lines: string[] = [];

  for (const field of Object.values(descriptor.fieldDescriptors)) {
    lines.push(`${field.name} - ${field.valueDescriptor.size} byte(s)`);

    if (field.paddingSize > 0) lines.push(`<padding> - ${field.paddingSize} byte(s)`);
  }

  if (descriptor.hasDynamicSize) lines.push('+ dynamic bytes');

  const maxLineSize = lines.reduce((max, line) => (line.length > max ? line.length : max), 0) + 4; // 4 spaces total padding
  const separator = '-'.repeat(maxLineSize + 2);

  let preview = separator;

  for (const line of lines) {
    const leftPadding = Math.floor((maxLineSize - line.length) / 2);
    const rightPadding = maxLineSize - line.length - leftPadding;

    preview += '\n|' + ' '.repeat(leftPadding) + line + ' '.repeat(rightPadding) + '|\n' + separator;
  }

  return preview;
}

export { getStructPreview };
