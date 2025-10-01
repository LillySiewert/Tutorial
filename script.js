import { escapeHTML, lineBreaks, convertToList, highlightHaskell, highlightTerminal, highlightJava, highlightProlog, highlightRacket } from './utils.js';

const chapterLinks = document.getElementById('chapter-left');
const contentDiv = document.getElementById('content');

// Render a tutorial JSON object (read-only)
export function renderTutorial(tutorialData) {
  chapterLinks.innerHTML = "";
  contentDiv.innerHTML = "";

  tutorialData.forEach((chapter, idx) => {
    // Sidebar link
    const sidebarLink = document.createElement('a');
    sidebarLink.href = `#chapter-${idx}`;
    sidebarLink.textContent = chapter.title;
    chapterLinks.appendChild(sidebarLink);

    // Chapter section
    const chapterSection = document.createElement('section');
    chapterSection.id = `chapter-${idx}`;

    const chapterTitle = document.createElement('h2');
    chapterTitle.textContent = chapter.title;
    chapterSection.appendChild(chapterTitle);

    chapter.sections.forEach(section => {
      if (section.type === "code") {
        const pre = document.createElement('pre');
        pre.innerHTML = highlightHaskell(section.content);
        pre.style.setProperty('--content-title', `"${section.title || 'default'}"`);
        chapterSection.appendChild(pre);

      } else if (section.type === "racket") {
        const pre = document.createElement('pre');
        pre.innerHTML = highlightRacket(section.content);
        pre.style.setProperty('--content-title', `"${section.title || 'default'}"`);
        chapterSection.appendChild(pre);
      } else if (section.type === "prolog") {
        const pre = document.createElement('pre');
        pre.innerHTML = highlightProlog(section.content);
        pre.style.setProperty('--content-title', `"${section.title || 'default'}"`);
        chapterSection.appendChild(pre);
      } else if (section.type === "java") {
        const pre = document.createElement('pre');
        pre.innerHTML = highlightJava(section.content);
        pre.style.setProperty('--content-title', `"${section.title || 'default'}"`);
        chapterSection.appendChild(pre);
      } else if (section.type === "picture") {   // match <option value="picture">
        const img = document.createElement('img');
        img.src = section.picture || "images/dreieck1.jpeg";
        img.alt = section.title || "Image";
        img.classList.add('tutorial-image');
        chapterSection.appendChild(img);
      } else if (section.type === "pictureSmall") {   // match <option value="picture">
        const img = document.createElement('img');
        img.src = section.picture || "images/dreieck1.jpeg";
        img.alt = section.title || "Image";
        img.classList.add('tutorial-image');
        img.classList.add('small');
        chapterSection.appendChild(img);
      }
      else if (section.type === "orderedList") {
        if (section.title) {
          const h4 = document.createElement('h4');
          h4.textContent = section.title;
          h4.classList.add('list-title');
          chapterSection.appendChild(h4);
        }
        const ol = document.createElement('ol');
        convertToList(section.content).forEach(item => ol.appendChild(item));
        chapterSection.appendChild(ol);
      }
      else if (section.type === "terminal" || section.type === "terminalMacOS") {
        const terminal = document.createElement('div');
        terminal.classList.add('terminal');

        // Terminal header
        const header = document.createElement('div');
        header.classList.add('terminal-header');

        if (section.type === "terminalMacOS") {
          ['close', 'minimize', 'maximize'].forEach(cls => {
            const btn = document.createElement('span');
            btn.classList.add('btn', cls);
            header.appendChild(btn);
          });
        }

        if (section.title) {
          const titleLabel = document.createElement('span');
          titleLabel.classList.add('terminal-title');
          titleLabel.textContent = section.title;
          header.appendChild(titleLabel);
        }

        terminal.appendChild(header);

        // Terminal content
        const content = document.createElement('div');
        content.classList.add('terminal-content');
        content.innerHTML = highlightTerminal(section.content);
        terminal.appendChild(content);

        chapterSection.appendChild(terminal);

      } else if (section.type === "link") {
        const a = document.createElement('a');
        a.href = section.content || "#";
        a.textContent = section.title || section.content;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        chapterSection.appendChild(a);
      } else if (section.type === "text") {
        if (section.title) {
          const h4 = document.createElement('h4');
          h4.textContent = section.title;
          chapterSection.appendChild(h4);
        }
        const div = document.createElement('div');
        div.classList.add('text-content');
        div.innerHTML = lineBreaks(section.content);
        chapterSection.appendChild(div);

      } else if (section.type === "list") {
        if (section.title) {
          const h4 = document.createElement('h4');
          h4.textContent = section.title;
          h4.classList.add('list-title');
          chapterSection.appendChild(h4);
        }
        const ul = document.createElement('ul');
        convertToList(section.content).forEach(item => ul.appendChild(item));
        chapterSection.appendChild(ul);
      }
    });

    contentDiv.appendChild(chapterSection);
  });
}

// Load tutorial JSON dynamically
export function loadTutorial(jsonPath) {
  fetch(jsonPath)
    .then(res => res.json())
    .then(data => renderTutorial(data))
    .catch(err => {
      contentDiv.textContent = "Failed to load tutorial data: " + err;
    });
}

// Toggle sidebar
document.getElementById('toggle-btn')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('hidden');
});
