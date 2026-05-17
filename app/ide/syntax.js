const SH_KW = new Set([
  'const','let','var','function','return','import','export','from','default',
  'if','else','for','while','do','switch','case','break','continue','class',
  'extends','new','typeof','instanceof','null','undefined','true','false',
  'async','await','try','catch','finally','throw','this','super','static',
  'get','set','of','in','delete','void','yield','type','interface','enum',
  'as','satisfies','require','module','exports',
])

function shEsc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function shSpan(color, text) {
  return `<span style="color:${color}">${shEsc(text)}</span>`
}

function highlightJsLine(line, inBlock) {
  if (inBlock) {
    const end = line.indexOf('*/')
    if (end === -1) return [shSpan('#6a9955', line), true]
    return [shSpan('#6a9955', line.slice(0, end + 2)) + highlightJsLine(line.slice(end + 2), false)[0], false]
  }
  let out = '', i = 0, len = line.length
  while (i < len) {
    if (line[i] === '/' && line[i+1] === '*') {
      const e = line.indexOf('*/', i + 2)
      if (e === -1) { out += shSpan('#6a9955', line.slice(i)); return [out, true] }
      out += shSpan('#6a9955', line.slice(i, e + 2)); i = e + 2; continue
    }
    if (line[i] === '/' && line[i+1] === '/') { out += shSpan('#6a9955', line.slice(i)); break }
    if (line[i] === '`') {
      let j = i + 1
      while (j < len) { if (line[j] === '\\') { j += 2; continue } if (line[j] === '`') { j++; break } j++ }
      out += shSpan('#ce9178', line.slice(i, j)); i = j; continue
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]; let j = i + 1
      while (j < len && line[j] !== q) { if (line[j] === '\\') j++; j++ }
      if (line[j] === q) j++
      out += shSpan('#ce9178', line.slice(i, j)); i = j; continue
    }
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i-1]))) {
      let j = i; while (j < len && /[\d.xXa-fA-F_]/.test(line[j])) j++
      out += shSpan('#b5cea8', line.slice(i, j)); i = j; continue
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i; while (j < len && /[\w$]/.test(line[j])) j++
      const w = line.slice(i, j)
      if (SH_KW.has(w))    out += shSpan('#569cd6', w)
      else if (line[j] === '(') out += shSpan('#dcdcaa', w)
      else                   out += shEsc(w)
      i = j; continue
    }
    if (line[i] === '<' && /[a-zA-Z/]/.test(line[i+1] || '')) {
      out += '&lt;'; i++
      let j = i; while (j < len && /[\w.]/.test(line[j])) j++
      if (j > i) { out += shSpan('#4ec9b0', line.slice(i, j)); i = j }
      continue
    }
    out += shEsc(line[i]); i++
  }
  return [out, false]
}

function highlightCssLine(line, inBlock) {
  if (inBlock) {
    const e = line.indexOf('*/')
    if (e === -1) return [shSpan('#6a9955', line), true]
    return [shSpan('#6a9955', line.slice(0, e + 2)) + highlightCssLine(line.slice(e + 2), false)[0], false]
  }
  if (line.includes('/*')) {
    const s = line.indexOf('/*'), e = line.indexOf('*/', s + 2)
    if (e === -1) return [shEsc(line.slice(0, s)) + shSpan('#6a9955', line.slice(s)), true]
    return [shEsc(line.slice(0, s)) + shSpan('#6a9955', line.slice(s, e + 2)) + highlightCssLine(line.slice(e + 2), false)[0], false]
  }
  let out = line
  out = out.replace(/^(\s*)(@[\w-]+)/, (_, sp, at) => shEsc(sp) + shSpan('#c586c0', at))
  if (/{/.test(out) && !/:/.test(out.split('{')[0])) {
    out = out.replace(/^(.*?)(\s*\{)/, (_, sel, b) => shSpan('#d7ba7d', sel) + shEsc(b))
  } else {
    out = out.replace(/^(\s*)([\w-]+)(\s*:)/, (_, sp, prop, col) => shEsc(sp) + shSpan('#9cdcfe', prop) + shEsc(col))
    out = out.replace(/:\s*(.+?)(;?\s*)$/, (_, val, end) => ': ' + shSpan('#ce9178', val.trim()) + shEsc(end))
  }
  return [shEsc(line) !== out ? out : shEsc(line), false]
}

function highlightJsonLine(line) {
  return shEsc(line)
    .replace(/^(\s*")((?:[^"\\]|\\.)*)(")(:\s*)/, (_, a, k, c, col) =>
      a + `<span style="color:#9cdcfe">${k}</span>` + c + col)
    .replace(/(?<=:\s*)"((?:[^"\\]|\\.)*)"/, (_, v) =>
      `: <span style="color:#ce9178">"${v}"</span>`)
    .replace(/(?<=:\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/, (_, n) =>
      `: <span style="color:#b5cea8">${n}</span>`)
    .replace(/(?<=:\s*)(true|false|null)/, (_, kw) =>
      `: <span style="color:#569cd6">${kw}</span>`)
}

function highlightMdLine(line) {
  const e = shEsc(line)
  if (/^#{1,6} /.test(line)) return `<span style="color:#569cd6;font-weight:700">${e}</span>`
  if (/^```/.test(line))      return `<span style="color:#6a9955">${e}</span>`
  if (/^---/.test(line))      return `<span style="color:#45475a">${e}</span>`
  return e
    .replace(/`([^`]+)`/g, `<span style="color:#ce9178">\`$1\`</span>`)
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:#cdd6f4">$1</strong>`)
}

function highlightXmlPart(s) {
  return shEsc(s)
    .replace(/(&lt;\?[\w]+)/, m => `<span style="color:#c586c0">${m}</span>`)
    .replace(/(&lt;\/)([\w:.-]+)/, (_, sl, n) => `${sl}<span style="color:#4ec9b0">${n}</span>`)
    .replace(/(&lt;)([\w:.-]+)/, (_, lt, n) => `${lt}<span style="color:#4ec9b0">${n}</span>`)
    .replace(/ ([\w:.-]+)(=&quot;)/g, (_, a, q) => ` <span style="color:#9cdcfe">${a}</span>${q}`)
    .replace(/&quot;([^&]*)&quot;/g, (_, v) => `&quot;<span style="color:#ce9178">${v}</span>&quot;`)
}

function highlightXmlLine(line, inComment) {
  if (inComment) {
    const e = line.indexOf('-->')
    if (e === -1) return [shSpan('#6a9955', line), true]
    return [shSpan('#6a9955', line.slice(0, e + 3)) + highlightXmlLine(line.slice(e + 3), false)[0], false]
  }
  const cs = line.indexOf('<!--')
  if (cs !== -1) {
    const ce = line.indexOf('-->', cs + 4)
    if (ce === -1) return [highlightXmlPart(line.slice(0, cs)) + shSpan('#6a9955', line.slice(cs)), true]
    return [highlightXmlPart(line.slice(0, cs)) + shSpan('#6a9955', line.slice(cs, ce + 3)) + highlightXmlLine(line.slice(ce + 3), false)[0], false]
  }
  return [highlightXmlPart(line), false]
}

const DOCKER_KW = new Set([
  'FROM','RUN','CMD','LABEL','EXPOSE','ENV','ADD','COPY','ENTRYPOINT',
  'VOLUME','USER','WORKDIR','ARG','ONBUILD','STOPSIGNAL','HEALTHCHECK','SHELL',
])

function highlightDockerLine(line) {
  if (/^#/.test(line.trim())) return shSpan('#6a9955', line)
  return shEsc(line).replace(
    /^(\s*)([A-Z]+)(\s+)/,
    (_, sp, kw, ws) => shEsc(sp) + (DOCKER_KW.has(kw) ? shSpan('#569cd6', kw) : shEsc(kw)) + shEsc(ws)
  ).replace(/\\$/, `<span style="color:#89dceb">\\</span>`)
}

export function syntaxHighlight(code, ext) {
  const lines = (code || '').split('\n')
  if (ext === 'md')  return lines.map(highlightMdLine).join('\n')
  if (ext === 'json') return lines.map(highlightJsonLine).join('\n')
  if (ext === 'svg' || ext === 'xml' || ext === 'html') {
    let inComment = false
    return lines.map(l => { const [r, nc] = highlightXmlLine(l, inComment); inComment = nc; return r }).join('\n')
  }
  if (ext === 'css') {
    let inBlock = false
    return lines.map(l => { const [r, nb] = highlightCssLine(l, inBlock); inBlock = nb; return r }).join('\n')
  }
  if (ext === 'jsx' || ext === 'js' || ext === 'ts' || ext === 'tsx') {
    let inBlock = false
    return lines.map(l => { const [r, nb] = highlightJsLine(l, inBlock); inBlock = nb; return r }).join('\n')
  }
  if (ext === 'dock') return lines.map(highlightDockerLine).join('\n')
  return lines.map(shEsc).join('\n')
}
