// ===== Utils =====

export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function lineBreaks(str) {
  str = str.replace(/\\n/g, "\n");
  return str.split("\n").map(line => {
    line = line.trim();
    line = line.replace(/\$\+/gm, "+");
    line = escapeHTML(line);
    line = line.replace(/(\*\*.*?\*\*)/g, m => `<strong>${m.slice(2, -2)}</strong>`);
    line = line.replace(/(\*.*?\*)/g, m => `<em>${m.slice(1, -1)}</em>`);
    line = line.replace(/(\+(?!\+).*?\+)/g, m => `<mark>${m.slice(1, -1)}</mark>`);
    line = line.replace(/(#.*?#)/g, m => `<i>${m.slice(1, -1)}</i>`);
    line = line.replace(/`(.*?)`/g, (m, p1) => `<code>${p1}</code>`);
    line = line.replace(/_(.*?)_/g, (m, p1) => `<u>${p1}</u>`);
    line = line.replace(/\\\\l/gm, "<br class='line-break-small'/>");
    line = line.replace(/\\l/gm, "<br class='line-break'/>");
    return `<p>${line}</p>`
  }).join("<br>");
}

export function convertToList(str) {
  str = str.replace(/\\n/g, "\n");
  return str.split("\n").map(line => {
    const li = document.createElement('li');
    line = lineBreaks(line);
    li.innerHTML = line;
    return li;
  });
}


/**
 * highlightHaskell(code)
 * - protects strings and block comments via tokens
 * - highlights function names, type constraints, types, keywords, and operators
 * - ensures no regex touches already-inserted HTML
 */
export function highlightHaskell(code) {
  const keywords = [
    "import", "let", "in", "if", "then", "else", "case", "of", "data",
    "where", "do", "module", "main", "deriving", "type", "newtype",
    "class", "instance", "default", "forall"
  ];
  const keywordRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");

  return code.split("\n").map(rawLine => {
    // 1) escape once
    let line = escapeHTML(rawLine);

    // 2) tokenize strings (they are escaped now as &quot;...&quot;)
    const stringTokens = [];
    line = line.replace(/&quot;(.*?)&quot;/g, (m) => {
      const id = stringTokens.length;
      stringTokens.push(m); // keep the escaped string markup
      return `__STR_${id}__`;
    });

    // 3) tokenize inline block comments { - ... - } (simple inline handling)
    const blockTokens = [];
    line = line.replace(/{-(.*?)-}/g, (m) => {
      const id = blockTokens.length;
      blockTokens.push(m);
      return `__BLK_${id}__`;
    });

    // 4) extract single-line comment (everything after --), protect it and skip highlighting for that part
    let commentHTML = "";
    const singleCommentMatch = line.match(/--.*/);
    if (singleCommentMatch) {
      const idx = line.indexOf(singleCommentMatch[0]);
      // split into code part and comment part
      const codePart = line.slice(0, idx);
      const commentPart = singleCommentMatch[0]; // already escaped
      line = codePart; // we'll highlight codePart and append comment later
      commentHTML = `<span class="comment">${commentPart}</span>`;
    }

    // 5) Now do prioritized replacements on `line` (which has tokens in place of strings/block comments)
    // We'll replace matches with placeholders to avoid later matches touching inserted HTML.
    const placeholderMap = new Map();
    let phCounter = 0;
    const makePH = html => {
      const k = `__PH_${phCounter++}__`;
      placeholderMap.set(k, html);
      return k;
    };

    // a) function name at line start (before '=')
    line = line.replace(/^([a-z_][a-zA-Z0-9_']*)(?=\s*=)/, (m) => makePH(`<span class="function">${m}</span>`));

    // b) type constraints like "Num t" or "Show a" (one-capital + var). handle multiple by global
    line = line.replace(/\b([A-Z][a-zA-Z0-9_]*)\s+([a-z][a-zA-Z0-9_]*)\b/g,
      (m, typeName, typeVar) => makePH(`<span class="type">${typeName} ${typeVar}</span>`));

    // c) standalone capitalized Types (Int, Maybe...)
    line = line.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, (m) => makePH(`<span class="type">${m}</span>`));

    // d) keywords
    line = line.replace(keywordRegex, (m) => makePH(`<span class="keyword">${m}</span>`));

    // e) operators last (so '=' is still present for function detection earlier)
    line = line.replace(/(::|->|=>|<-|\|)/g, (m) => makePH(`<span class="operator">${m}</span>`));
    line = line.replace(/=(?!>)/g, (m) => makePH(`<span class="operator">${m}</span>`));

    // 6) restore placeholders (safe because placeholders won't match our regexes)
    if (placeholderMap.size) {
      // replace each placeholder with its HTML
      for (const [ph, html] of placeholderMap.entries()) {
        // global replace of the placeholder token
        line = line.split(ph).join(html);
      }
    }

    // 7) restore block comments and strings (wrap them in spans)
    if (blockTokens.length) {
      for (let i = 0; i < blockTokens.length; i++) {
        const token = `__BLK_${i}__`;
        const original = blockTokens[i]; // already escaped
        line = line.split(token).join(`<span class="comment">${original}</span>`);
      }
    }
    if (stringTokens.length) {
      for (let i = 0; i < stringTokens.length; i++) {
        const token = `__STR_${i}__`;
        const original = stringTokens[i]; // already escaped &quot;...&quot;
        line = line.split(token).join(`<span class="string">${original}</span>`);
      }
    }

    // 8) append single-line comment if present
    if (commentHTML) {
      // ensure a space separation
      if (line && !/\s$/.test(line)) line += " ";
      line += commentHTML;
    }

    return line;
  }).join("<br>");
}


export function highlightTerminal(code) {
  const lines = code.split("\n").map(rawLine => rawLine.replace(/\r$/, ""));
  return lines.map(line => {
    const resultMatch = line.match(/^\s*#\s?(.*)$/);
    if (resultMatch) return `<span class="result">${escapeHTML(resultMatch[1])}</span>`;
    const commentMatch = line.match(/(--.*)$/);
    let before = line, comment = "";
    if (commentMatch) {
      before = line.slice(0, commentMatch.index);
      comment = commentMatch[0];
    }
    return `&gt; ${escapeHTML(before)}${comment ? `<span class="comment">${escapeHTML(comment)}</span>` : ""}`;
  }).join("<br>");
}

// ===== Session Storage Helpers =====
export function saveToSessionStorage(data, key = 'tutorialData') {
  if (!data) return;
  sessionStorage.setItem(key, JSON.stringify(data));
}

export function loadFromSessionStorage(key = 'tutorialData') {
  const dataStr = sessionStorage.getItem(key);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr);
  } catch {
    return null;
  }
}

export function highlightJava(code) {
  const keywords = [
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while", "true", "false", "null", "String"
  ];

  const lines = code.split("\n");
  return lines.map(line => {
    let l = line;
    l = l.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Comments (single + multi-line)
    if (l.match(/(\/\/.*$)/g) || l.match(/(\/\*[\s\S]*?\*\/)/g)) {
      l = l.replace(/(\/\/.*$)/g, m => `<span class="comment">${m}</span>`)
        .replace(/(\/\*[\s\S]*?\*\/)/g, m => `<span class="comment">${m}</span>`);
    } else {
      // Strings
      l = l.replace(/(".*?")/g, m => `<span class="string">${m}</span>`);

      // Keywords
      const keywordRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");
      l = l.replace(keywordRegex, m => `<span class="keyword">${m}</span>`);


      // Explicit class/interface declarations
      l = l.replace(
        /\b(class|interface)\s+([A-Z][a-zA-Z0-9_]*(?:&lt;[^&]+&gt;)*)/g,
        (_, k, name) => `${k} <span class="class">${name}</span>`
      );
    }

    // Other Capitalized identifiers (ignore comment spans)
    l = l.replace(/^(.*?)<span class="comment">.*$/, (full, codePart) => {
      return codePart.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, m => `<span class="class">${m}</span>`).replace(/(\b|\.)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, (m, dot, name) => {
        if (keywords.includes(name)) return m; // skip keywords
        return `${dot}<span class="function">${name}</span>`;
      })
        + full.slice(codePart.length);
    });

    // If there's no comment span in the line, highlight the whole line
    if (!l.includes('<span class="comment">')) {
      l = l.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, m => `<span class="class">${m}</span>`).replace(/(\b|\.)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, (m, dot, name) => {
        if (keywords.includes(name)) return m; // skip keywords
        return `${dot}<span class="function">${name}</span>`;
      });;
    }

    return l;
  }).join("<br>");
}

export function highlightProlog(code) {
  const keywords = ["is", "not", "fail", "true", "false", "consult", "dynamic", "assert", "retract", "clause", "abolish"];
  const regex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");

  return code.split("\n").map(line => {
    // Strings
    line = line.replace(/(['"].*?['"])/g, m => `<span class="string">${escapeHTML(m)}</span>`);

    // Keywords
    line = line.replace(regex, m => `<span class="keyword">${escapeHTML(m)}</span>`);

    // Variables (start with uppercase or underscore)
    line = line.replace(/\b([A-Z_][a-zA-Z0-9_]*)\b/g, m => `<span class="class">${escapeHTML(m)}</span>`);

    // Line comments %
    line = line.replace(/(%.*)$/, (m, p1) => `<span class="comment">${escapeHTML(p1)}</span>`);

    // Block comments /* ... */
    line = line.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="comment">${escapeHTML(m)}</span>`);

    return line;
  }).join("<br>");
}

export function highlightRacket(code) {
  const keywords = ["define", "lambda", "if", "cond", "let", "let*", "letrec", "begin", "require", "provide", "struct", "set!", "#t", "#f"];
  const regex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");

  return code.split("\n").map(line => {
    // Strings
    line = line.replace(/(".*?")/g, m => `<span class="string">${escapeHTML(m)}</span>`);

    // Keywords
    line = line.replace(regex, m => `<span class="keyword">${escapeHTML(m)}</span>`);

    // Function names: (foo ...)
    line = line.replace(/\((\w+)/g, (m, name) => `(<span class="function">${escapeHTML(name)}</span>`);

    // Comments ;
    line = line.replace(/(;.*)$/, (m, p1) => `<span class="comment">${escapeHTML(p1)}</span>`);

    return line;
  }).join("<br>");
}

export function highlightCode(language, code) {
  let keywords = [];
  let commentLine, commentBlock, stringRegex, functionRegex;

  switch (language.toLowerCase()) {
    case "haskell":
      keywords = ["import", "let", "in", "if", "then", "else", "data", "where", "do", "module", "main", "deriving", "type"];
      commentLine = /(--.*)$/;
      stringRegex = /(".*?")/g;
      functionRegex = /^(\w+)(?=\s*=)/;
      break;

    case "prolog":
      keywords = ["is", "not", "fail", "true", "false", "consult", "dynamic", "assert", "retract", "clause", "abolish"];
      commentLine = /(%.*)$/;
      commentBlock = /\/\*[\s\S]*?\*\//g;
      stringRegex = /(['"].*?['"])/g;
      break;

    case "racket":
      keywords = ["define", "lambda", "if", "cond", "let", "let*", "letrec", "begin", "require", "provide", "struct", "set!", "#t", "#f"];
      commentLine = /(;.*)$/;
      stringRegex = /(".*?")/g;
      functionRegex = /\((\w+)/g;
      break;

    default:
      return escapeHTML(code); // Fallback: no highlighting
  }

  const keywordRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");

  return code.split("\n").map(line => {
    let l = escapeHTML(line);

    // Strings
    if (stringRegex) {
      l = l.replace(stringRegex, m => `<span class="string">${m}</span>`);
    }

    // Keywords
    if (keywords.length > 0) {
      l = l.replace(keywordRegex, m => `<span class="keyword">${m}</span>`);
    }

    // Functions
    if (functionRegex) {
      if (language === "haskell") {
        l = l.replace(functionRegex, m => `<span class="function">${m}</span>`);
      } else if (language === "racket") {
        l = l.replace(functionRegex, (m, name) => `(<span class="function">${name}</span>`);
      }
    }

    // Variables (Prolog uppercase identifiers)
    if (language === "prolog") {
      l = l.replace(/\b([A-Z_][a-zA-Z0-9_]*)\b/g, m => `<span class="class">${m}</span>`);
    }

    // Line comments
    if (commentLine) {
      l = l.replace(commentLine, (m, p1) => `<span class="comment">${p1}</span>`);
    }

    // Block comments (Prolog only)
    if (commentBlock) {
      l = l.replace(commentBlock, m => `<span class="comment">${m}</span>`);
    }

    return l;
  }).join("<br>");
}