// Edits one property of a JSON file in place, keeping its comments, trailing commas and layout, as
// Zed, OpenCode and VS Code settings files have them. Only the edited property's text changes.

function syntax(message, at) {
  return new SyntaxError(`${message} at offset ${at}`)
}

/** Parses JSON with comments and trailing commas into nodes that remember where they sit in the text. */
export function parseTree(text) {
  let at = 0

  function skip() {
    for (;;) {
      while (at < text.length && /\s/.test(text[at])) at += 1
      if (text.startsWith('//', at)) {
        const end = text.indexOf('\n', at)
        at = end === -1 ? text.length : end + 1
      } else if (text.startsWith('/*', at)) {
        const end = text.indexOf('*/', at + 2)
        if (end === -1) throw syntax('unterminated comment', at)
        at = end + 2
      } else return
    }
  }

  function string() {
    const start = at
    at += 1
    while (at < text.length && text[at] !== '"') at += text[at] === '\\' ? 2 : 1
    if (at >= text.length) throw syntax('unterminated string', start)
    at += 1
    return { type: 'string', start, end: at, value: JSON.parse(text.slice(start, at)) }
  }

  function value() {
    skip()
    const start = at
    const char = text[at]
    if (char === '{') {
      at += 1
      const props = []
      for (;;) {
        skip()
        if (text[at] === '}') break
        if (text[at] !== '"') throw syntax('expected a property name', at)
        const key = string()
        skip()
        if (text[at] !== ':') throw syntax('expected :', at)
        at += 1
        const node = value()
        props.push({ key: key.value, start: key.start, value: node })
        skip()
        if (text[at] === ',') at += 1
        else if (text[at] !== '}') throw syntax('expected , or }', at)
      }
      at += 1
      return { type: 'object', start, end: at, props }
    }
    if (char === '[') {
      at += 1
      const items = []
      for (;;) {
        skip()
        if (text[at] === ']') break
        items.push(value())
        skip()
        if (text[at] === ',') at += 1
        else if (text[at] !== ']') throw syntax('expected , or ]', at)
      }
      at += 1
      return { type: 'array', start, end: at, items }
    }
    if (char === '"') return string()
    const literal = text.slice(at).match(/^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)
    if (!literal) throw syntax('unexpected token', at)
    at += literal[0].length
    return { type: 'literal', start, end: at, value: JSON.parse(literal[0]) }
  }

  const root = value()
  skip()
  if (at !== text.length) throw syntax('unexpected text after the value', at)
  return root
}

/** The plain value of a parsed node. */
export function toValue(node) {
  if (node.type === 'object') return Object.fromEntries(node.props.map((prop) => [prop.key, toValue(prop.value)]))
  if (node.type === 'array') return node.items.map(toValue)
  return node.value
}

/** Reads a JSON-with-comments file's text into a plain value; empty text reads as `{}`. */
export function parseJsonc(text) {
  return text.trim() ? toValue(parseTree(text)) : {}
}

function indentUnit(text) {
  const line = text.match(/\n([ \t]+)\S/)
  return line ? line[1] : '  '
}

function render(value, unit, depth) {
  return JSON.stringify(value, null, unit).replace(/\n/g, `\n${unit.repeat(depth)}`)
}

/** The offset just past the comma that follows `from`, skipping spaces and comments, or -1. */
function commaAfter(text, from) {
  const rest = text.slice(from).match(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*,/)
  return rest ? from + rest[0].length : -1
}

/**
 * Sets `path` (object keys) to `value`, creating missing objects; `undefined` deletes the last key.
 * Returns the new text, or the same text when there was nothing to delete.
 */
export function setJsonc(text, path, value) {
  if (!text.trim()) text = '{}\n'
  const unit = indentUnit(text)
  let node = parseTree(text)
  for (let depth = 0; depth < path.length; depth += 1) {
    if (node.type !== 'object') throw new SyntaxError(`${path.slice(0, depth).join('.')} is not an object`)
    const key = path[depth]
    const index = node.props.findIndex((prop) => prop.key === key)
    const last = depth === path.length - 1
    if (index !== -1 && !last && node.props[index].value.type === 'object') {
      node = node.props[index].value
      continue
    }
    if (value === undefined) {
      if (index === -1 || !last) return text
      const prop = node.props[index]
      const after = commaAfter(text, prop.value.end)
      if (after !== -1) {
        // Drop the property, its comma and the line break before it.
        const lineStart = text.lastIndexOf('\n', prop.start)
        const from = lineStart > node.start ? lineStart : prop.start
        return text.slice(0, from) + text.slice(after)
      }
      const previous = node.props[index - 1]
      const from = previous ? commaAfter(text, previous.value.end) - 1 : text.lastIndexOf('\n', prop.start) > node.start ? text.lastIndexOf('\n', prop.start) : prop.start
      return text.slice(0, from) + text.slice(prop.value.end)
    }
    // Build what is missing below this object as one value.
    const rest = path.slice(depth + 1).reduceRight((inner, part) => ({ [part]: inner }), value)
    if (index !== -1) {
      const prop = node.props[index]
      return text.slice(0, prop.value.start) + render(rest, unit, depth + 1) + text.slice(prop.value.end)
    }
    const entry = `${JSON.stringify(key)}: ${render(rest, unit, depth + 1)}`
    const inner = unit.repeat(depth + 1)
    if (!node.props.length) {
      return `${text.slice(0, node.start + 1)}\n${inner}${entry}\n${unit.repeat(depth)}${text.slice(node.end - 1)}`
    }
    const lastProp = node.props[node.props.length - 1]
    const trailing = commaAfter(text, lastProp.value.end)
    // A comment on the last property's line stays with that property.
    const lineEnd = (from) => from + text.slice(from).match(/^[ \t]*(?:\/\*[^\n]*?\*\/[ \t]*)*(?:\/\/[^\n]*)?/)[0].length
    if (trailing !== -1) {
      const at = lineEnd(trailing)
      return `${text.slice(0, at)}\n${inner}${entry},${text.slice(at)}`
    }
    const at = lineEnd(lastProp.value.end)
    return `${text.slice(0, lastProp.value.end)},${text.slice(lastProp.value.end, at)}\n${inner}${entry}${text.slice(at)}`
  }
  return text
}
