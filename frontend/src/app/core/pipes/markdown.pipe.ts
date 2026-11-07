import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(rawText: string | null | undefined): SafeHtml {
    if (!rawText) return '';

    // 1. Sanitización inicial estricta de caracteres HTML para prevenir XSS
    let text = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Extraer bloques de código (```lang ... ```)
    const codeBlocks: string[] = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const index = codeBlocks.length;
      const langBadge = lang
        ? `<div class="text-[10px] uppercase font-mono tracking-wider text-slate-400 pb-1 mb-2 border-b border-slate-700/60">${lang}</div>`
        : '';
      codeBlocks.push(
        `<pre class="code-block">${langBadge}<code>${code.trim()}</code></pre>`
      );
      return `@@@CODEBLOCK${index}@@@`;
    });

    // 3. Extraer código inline (`código`)
    const inlineCodes: string[] = [];
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
      const index = inlineCodes.length;
      inlineCodes.push(`<code class="inline-code">${code}</code>`);
      return `@@@INLINECODE${index}@@@`;
    });

    // 4. Tablas Markdown (| col1 | col2 |)
    text = this.parseTables(text);

    // 5. Encabezados (#, ##, ###, ####)
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 6. Separadores horizontales (--- o ***)
    text = text.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr/>');

    // 7. Citas (> texto)
    text = text.replace(/^>\s?(.*$)/gim, '<blockquote>$1</blockquote>');

    // 8. Negrita y Cursiva
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g, '<em>$1</em>');

    // 9. Enlaces seguros [texto](url) - sólo http/https o relativos
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|\/[^\s\)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 10. Listas ordenadas y desordenadas
    text = this.parseLists(text);

    // 11. Párrafos
    text = this.parseParagraphs(text);

    // 12. Restaurar código inline y bloques de código
    inlineCodes.forEach((code, i) => {
      text = text.replace(new RegExp(`@@@INLINECODE${i}@@@`, 'g'), code);
    });

    codeBlocks.forEach((block, i) => {
      text = text.replace(new RegExp(`@@@CODEBLOCK${i}@@@`, 'g'), block);
    });

    // Sanitización obligatoria por medio del SecurityContext de Angular (sin bypass)
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, text);
    return sanitized || '';
  }

  private parseTables(text: string): string {
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    const outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        const isSeparator = cells.every(c => /^:?-+:?$/.test(c));

        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="markdown-table-wrapper"><table><thead><tr>';
          cells.forEach(c => {
            tableHtml += `<th>${c}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
        } else if (isSeparator) {
          continue;
        } else {
          tableHtml += '<tr>';
          cells.forEach(c => {
            tableHtml += `<td>${c}</td>`;
          });
          tableHtml += '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table></div>';
          outputLines.push(tableHtml);
          inTable = false;
          tableHtml = '';
        }
        outputLines.push(lines[i]);
      }
    }

    if (inTable) {
      tableHtml += '</tbody></table></div>';
      outputLines.push(tableHtml);
    }

    return outputLines.join('\n');
  }

  private parseLists(text: string): string {
    const lines = text.split('\n');
    let inUl = false;
    let inOl = false;
    const outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^\s*[\-\*]\s+(.*)$/);
      const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);

      if (ulMatch) {
        if (inOl) {
          outputLines.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          outputLines.push('<ul>');
          inUl = true;
        }
        outputLines.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (inUl) {
          outputLines.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          outputLines.push('<ol>');
          inOl = true;
        }
        outputLines.push(`<li>${olMatch[1]}</li>`);
      } else {
        if (inUl) {
          outputLines.push('</ul>');
          inUl = false;
        }
        if (inOl) {
          outputLines.push('</ol>');
          inOl = false;
        }
        outputLines.push(line);
      }
    }

    if (inUl) outputLines.push('</ul>');
    if (inOl) outputLines.push('</ol>');

    return outputLines.join('\n');
  }

  private parseParagraphs(text: string): string {
    const blocks = text.split(/\n\s*\n/);
    return blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|div|hr|table)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    }).filter(b => b.length > 0).join('\n');
  }
}

