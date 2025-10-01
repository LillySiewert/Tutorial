// ======== Tutorial Editor JS ========
import { escapeHTML, lineBreaks, convertToList, highlightHaskell, highlightTerminal, saveToSessionStorage, loadFromSessionStorage, highlightJava, highlightProlog, highlightRacket } from './utils.js';

// DOM elements
const chapterLinks = document.getElementById('chapter-left');
const contentDiv = document.getElementById('content');
const chapterEditor = document.getElementById("chapter-editor");
const sectionForm = document.getElementById("section-form");
const sectionTitleInput = document.getElementById("section-title");
const sectionTypeSelect = document.getElementById("section-type");
const sectionContentTextarea = document.getElementById("section-content");
const sectionPictureInput = document.getElementById("section-picture");
const saveSectionBtn = document.getElementById("save-section");
const deleteSectionBtn = document.getElementById("delete-section");
const newChapterBtn = document.getElementById("new-chapter-btn");
const uploadJsonInput = document.getElementById("load-json");
const exportJsonBtn = document.getElementById("save-json-btn");
const clearTutorialBtn = document.getElementById("clear-tutorial-btn");

export let tutorialData = [];
let currentChapter = null;
let currentSectionIndex = null;

const sessionData = loadFromSessionStorage();
if (sessionData) {
  tutorialData = sessionData;
  if (tutorialData.length > 0) editChapter(tutorialData[0]);
  renderTutorial();
}

// ======= Section Form Helpers =======
export function sectionFormReset() {
  currentSectionIndex = null;
  sectionTitleInput.value = "";
  sectionTypeSelect.value = "text";
  sectionContentTextarea.value = "";
  sectionPictureInput.value = "";
}

// ======= Render Tutorial =======
export function renderTutorial() {
  chapterLinks.innerHTML = "";
  contentDiv.innerHTML = "";

  tutorialData.forEach((chapter, idx) => {
    // Sidebar chapter container
    const chapDiv = document.createElement('div');
    chapDiv.classList.add('chapter-item');
    chapDiv.setAttribute('draggable', 'true');
    chapDiv.dataset.index = idx; // original index reference

    const divChapter = document.createElement('div');
    divChapter.classList.add('chapter');

    const divTitle = document.createElement('div');
    divTitle.classList.add('chapter-title');

    const buttonCollapse = document.createElement('button');
    buttonCollapse.classList.add('toggle-btn');
    buttonCollapse.classList.add('btn');
    chapDiv.classList.add('collapsed');
    buttonCollapse.textContent = "";
    buttonCollapse.addEventListener('click', () => {
      chapDiv.classList.toggle('collapsed');
    });
    divTitle.appendChild(buttonCollapse);

    const titleSpan = document.createElement('p');
    titleSpan.textContent = (chapter.title && chapter.title.length > 20 ? chapter.title.slice(0, 20) + '…' : chapter.title) || `Chapter ${idx + 1}`;
    divTitle.appendChild(titleSpan);
    divChapter.appendChild(divTitle);

    // Edit & Delete buttons
    const divBtns = document.createElement('div');
    divBtns.classList.add('chapter-buttons');

    const editBtn = document.createElement('button');
    editBtn.textContent = "Edit";
    editBtn.classList.add("macos-button");
    editBtn.addEventListener('click', () => {
      editChapter(chapter);
      renderTutorial();
    });
    divBtns.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = "Delete";
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener('click', () => {
      tutorialData.splice(idx, 1);
      if (currentChapter === chapter) currentChapter = null;
      renderTutorial();
      chapterEditor.innerHTML = "";
      sectionFormReset();
      saveToSessionStorage(tutorialData);
    });
    divBtns.appendChild(delBtn);

    divChapter.appendChild(divBtns);
    chapDiv.appendChild(divChapter);

    // Sections list in sidebar (give it a class so we can find/create easily)
    if (chapter.sections && chapter.sections.length > 0) {
      const secList = document.createElement('div');
      secList.classList.add('section-list');
      chapter.sections.forEach((sec, sidx) => {
        const secDiv = document.createElement('div');
        secDiv.classList.add('section-item');
        secDiv.setAttribute('draggable', 'true');

        // store original location references so we can rebuild from DOM on drop
        secDiv.dataset.index = sidx;              // original section index inside original chapter
        secDiv.dataset.chapterIndex = idx;        // original chapter index

        secDiv.textContent = (sec.title && sec.title.length > 15 ? sec.title.slice(0, 15) + '…' : sec.title) || sec.type;

        const divSecBtns = document.createElement('div');
        divSecBtns.classList.add('section-buttons');

        const secEdit = document.createElement('button');
        secEdit.textContent = "Edit";
        secEdit.classList.add("macos-button");
        secEdit.addEventListener('click', () => {
          editChapter(chapter);
          editSection(sidx);
        });
        divSecBtns.appendChild(secEdit);

        const secDel = document.createElement('button');
        secDel.textContent = "Delete";
        secDel.classList.add("delete-btn");
        secDel.addEventListener('click', () => {
          chapter.sections.splice(sidx, 1);
          if (currentChapter === chapter && currentSectionIndex === sidx) {
            sectionFormReset();
            currentSectionIndex = null;
          }
          renderTutorial();
          if (currentChapter === chapter) renderSectionList();
          saveToSessionStorage(tutorialData);
        });
        divSecBtns.appendChild(secDel);

        // append btns separately to keep text content simple
        secDiv.appendChild(divSecBtns);
        secList.appendChild(secDiv);
      });
      chapDiv.appendChild(secList);
    }

    chapterLinks.appendChild(chapDiv);
  });

  // After DOM built, enable drag & drop handling
  enableDragAndDrop();

  // Render main content only for currentChapter
  if (currentChapter) {
    const chapterSection = document.createElement('section');
    const chapterTitle = document.createElement('h2');
    chapterTitle.textContent = currentChapter.title;
    chapterSection.appendChild(chapterTitle);

    currentChapter.sections.forEach(section => {
      if (section.type === "text") {
        if (section.title) {
          const h4 = document.createElement('h4');
          h4.textContent = section.title;
          chapterSection.appendChild(h4);
        }
        const div = document.createElement('div');
        div.classList.add('text-content');
        div.innerHTML = lineBreaks(section.content);
        chapterSection.appendChild(div);
      } else if (section.type === "code") {
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
      }
      else if (section.type === "java") {
        const pre = document.createElement('pre');
        pre.innerHTML = highlightJava(section.content);
        pre.style.setProperty('--content-title', `"${section.title || 'default'}"`);
        chapterSection.appendChild(pre);
      } else if (section.type === "picture") {
        const img = document.createElement('img');
        img.src = section.picture || "images/dreieck1.jpeg";
        img.alt = section.title || "Image";
        img.classList.add('tutorial-image');
        chapterSection.appendChild(img);
      } else if (section.type === "pictureSmall") {
        const img = document.createElement('img');
        img.src = section.picture || "images/dreieck1.jpeg";
        img.alt = section.title || "Image";
        img.classList.add('tutorial-image', 'small');
        chapterSection.appendChild(img);
      } else if (section.type === "orderedList") {
        if (section.title) {
          const h4 = document.createElement('h4');
          h4.textContent = section.title;
          h4.classList.add('list-title');
          chapterSection.appendChild(h4);
        }
        const ol = document.createElement('ol');
        convertToList(section.content).forEach(item => ol.appendChild(item));
        chapterSection.appendChild(ol);
      } else if (section.type === "terminal" || section.type === "terminalMacOS") {
        const terminal = document.createElement('div');
        terminal.classList.add('terminal');

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
  }
}

// ======= Drag & Drop Helpers =======
function enableDragAndDrop() {
  // Allow dropping anywhere in the chapterLinks container
  chapterLinks.addEventListener('dragover', (e) => {
    e.preventDefault(); // allow drop
  });

  // DRAG START / END for chapters
  chapterLinks.querySelectorAll('.chapter-item').forEach(chap => {
    chap.addEventListener('dragstart', (e) => {
      // mark it as a chapter drag
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'chapter' }));
      e.dataTransfer.effectAllowed = 'move';
      chap.classList.add('dragging');
    });

    chap.addEventListener('dragend', () => {
      chap.classList.remove('dragging');
    });

    // while dragging, reposition the dragging element relative to the hovered chapter
    chap.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = document.querySelector('.chapter-item.dragging');
      if (!dragging || dragging === chap) return;
      const rect = chap.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) {
        chap.parentNode.insertBefore(dragging, chap.nextSibling);
      } else {
        chap.parentNode.insertBefore(dragging, chap);
      }
    });

    // also allow dropping a section into the chapter area (to append sections)
    chap.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingSection = document.querySelector('.section-item.dragging');
      if (!draggingSection) return;
      // ensure there is a section-list container
      let secList = chap.querySelector('.section-list');
      if (!secList) {
        secList = document.createElement('div');
        secList.classList.add('section-list');
        chap.appendChild(secList);
      }
      // if hovering chapter (not a specific section), append to end
      if (!secList.contains(draggingSection)) secList.appendChild(draggingSection);
    });
  });

  // DRAG START / END / OVER for section items
  chapterLinks.querySelectorAll('.section-item').forEach(sec => {
    sec.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'section' }));
      e.dataTransfer.effectAllowed = 'move';
      sec.classList.add('dragging');
    });

    sec.addEventListener('dragend', () => {
      sec.classList.remove('dragging');
    });

    // reposition section within the section-list
    sec.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = document.querySelector('.section-item.dragging');
      if (!dragging || dragging === sec) return;
      const rect = sec.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) {
        sec.parentNode.insertBefore(dragging, sec.nextSibling);
      } else {
        sec.parentNode.insertBefore(dragging, sec);
      }
    });
  });

  // DROP handler on the parent container:
  // Rebuild tutorialData from DOM order (works for both chapter reorders and section moves)
  chapterLinks.addEventListener('drop', (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }

    // Build new tutorial structure by reading the current DOM order of chapter-items and,
    // for each chapter, the order of its section-item children. We use the original
    // dataset.chapterIndex/dataset.index to map back to original section objects.
    const chapDivs = Array.from(chapterLinks.querySelectorAll('.chapter-item'));
    const newTutorial = chapDivs.map(chapDiv => {
      const origChapIdx = parseInt(chapDiv.dataset.index);
      const origChap = tutorialData[origChapIdx] || { title: `Chapter ${origChapIdx + 1}`, sections: [] };
      const newChap = { title: origChap.title, sections: [] };

      const secDivs = Array.from(chapDiv.querySelectorAll('.section-item'));
      secDivs.forEach(secDiv => {
        const origSecChapIdx = parseInt(secDiv.dataset.chapterIndex);
        const origSecIdx = parseInt(secDiv.dataset.index);
        // safety checks
        if (Number.isFinite(origSecChapIdx) && Number.isFinite(origSecIdx)
            && tutorialData[origSecChapIdx] && tutorialData[origSecChapIdx].sections[origSecIdx]) {
          const secObj = tutorialData[origSecChapIdx].sections[origSecIdx];
          newChap.sections.push(secObj);
        }
      });

      return newChap;
    });

    // If the user dragged a chapter but didn't move any sections, the above will still
    // produce chapters with empty sections if the DOM had no '.section-item' children.
    // To preserve existing sections when they weren't part of the DOM (rare), we fill them:
    newTutorial.forEach((chap, i) => {
      if (chap.sections.length === 0) {
        // find original chapter based on original index mapping
        const origIndex = parseInt(chapDivs[i].dataset.index);
        if (tutorialData[origIndex]) chap.sections = tutorialData[origIndex].sections.slice();
      }
    });

    tutorialData = newTutorial;
    // reset currentChapter reference to the matching object if possible
    if (currentChapter) {
      const sameTitle = tutorialData.find(c => c.title === currentChapter.title);
      currentChapter = sameTitle || (tutorialData[0] || null);
    } else {
      currentChapter = tutorialData[0] || null;
    }

    saveToSessionStorage(tutorialData);
    renderTutorial();
  });
}

// ======= Editor Functions =======
export function editChapter(chapter) {
  currentChapter = chapter;
  currentSectionIndex = null;

  // use DOM methods rather than injecting chapter.title into innerHTML to avoid quote issues
  chapterEditor.innerHTML = `
    <label><h3>Chapter Title</h3></label>
    <input type="text" id="chapter-title" value="${chapter.title}">
    <div class="form-buttons">
      <button type="button" id="save-chapter">Save Chapter</button>
      <button id="add-section-btn" class="macos-button">+ Add Section</button>
    </div>
    <div id="section-list"></div>
  `;

  document.getElementById("save-chapter").addEventListener("click", () => {
    currentChapter.title = document.getElementById("chapter-title").value;
    renderTutorial();
    saveToSessionStorage(tutorialData);
  });

  document.getElementById("add-section-btn").addEventListener("click", () => {
    sectionFormReset();
  });

  renderSectionList();
}

export function renderSectionList() {
  const listDiv = document.getElementById("section-list");
  listDiv.innerHTML = "<button class='toggle-btn' id='toggle-section-list' class=''>Open List</button>";

  const toggleBtn = document.getElementById("toggle-section-list");

  currentChapter.sections.forEach((sec, idx) => {
    const div = document.createElement("div");
    div.classList.add("section-item");
    div.textContent = sec.title || sec.type;
    div.addEventListener("click", () => editSection(idx));
    if (toggleBtn.classList.contains("not-collapsed")) div.style.display = "none";
    listDiv.appendChild(div);
  });

  if (currentChapter.sections.length === 0) toggleBtn.style.display = "none";

  toggleBtn.addEventListener("click", () => {
    listDiv.classList.toggle("not-collapsed");
    toggleBtn.textContent = listDiv.classList.contains("not-collapsed") ? "Close List" : "Open List";
  });
}

export function editSection(idx) {
  currentSectionIndex = idx;
  const sec = currentChapter.sections[idx];
  sectionTitleInput.value = sec.title || "";
  sectionTypeSelect.value = sec.type;
  sectionContentTextarea.value = sec.content || "";
  sectionPictureInput.value = sec.picture || "";
}

// ======= Section Save/Delete =======
saveSectionBtn.addEventListener("click", () => {
  if (!currentChapter) return;

  const sec = {
    title: sectionTitleInput.value,
    type: sectionTypeSelect.value,
    content: sectionContentTextarea.value,
    picture: sectionPictureInput.value
  };

  if (currentSectionIndex !== null) {
    currentChapter.sections[currentSectionIndex] = sec;
  } else {
    currentChapter.sections.push(sec);
  }

  renderTutorial();
  renderSectionList();
  sectionFormReset();
  currentSectionIndex = null;

  saveToSessionStorage(tutorialData);
});

deleteSectionBtn.addEventListener("click", () => {
  if (currentChapter && currentSectionIndex !== null) {
    currentChapter.sections.splice(currentSectionIndex, 1);
    renderTutorial();
    renderSectionList();
    sectionFormReset();
    currentSectionIndex = null;

    saveToSessionStorage(tutorialData);
  }
});

// ======= Add new chapter =======
newChapterBtn.addEventListener("click", () => {
  const newChap = { title: "New Chapter", sections: [] };
  tutorialData.push(newChap);
  editChapter(newChap);
  renderTutorial();

  saveToSessionStorage(tutorialData);
});

// ======= Upload JSON =======
uploadJsonInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      tutorialData = JSON.parse(evt.target.result);
      if (tutorialData.length > 0) editChapter(tutorialData[0]);
      renderTutorial();

      saveToSessionStorage(tutorialData);
    } catch (err) {
      alert("Failed to load JSON: " + err);
    }
  };
  reader.readAsText(file);
});

// ======= Export JSON =======
exportJsonBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(tutorialData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = "tutorial.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ======= Clear Tutorial =======
clearTutorialBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the entire tutorial? This action cannot be undone.")) {
    tutorialData = [];
    currentChapter = null;
    currentSectionIndex = null;
    chapterEditor.innerHTML = "";
    sectionFormReset();
    renderTutorial();
    saveToSessionStorage(tutorialData);
  }
});

// ======= Initialize =======
renderTutorial();
