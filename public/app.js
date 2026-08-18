const letters = ["A", "B", "C", "D"];
const app = document.querySelector("#app");
const state = { questions: [], papers: [], paperId: "", index: 0, selected: null, results: {}, loading: false, error: "", navigator: false };

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function currentSet() { return state.questions.filter((question) => question.paperId === state.paperId); }

function render() {
  const set = currentSet();
  const question = set[state.index];
  if (!question) return;
  const result = state.results[question.id];
  const answered = set.filter((item) => state.results[item.id]).length;
  const correct = set.filter((item) => state.results[item.id]?.selected === state.results[item.id]?.correctIndex).length;
  app.innerHTML = `
    <header class="topbar"><a class="brand" href="#top"><span class="brand-mark">AQ</span><span>ADRE Quiz</span></a><button class="score-pill" data-action="navigator"><span>${answered}/${set.length}</span><small>answered</small></button></header>
    <section class="hero" id="top"><div><p class="eyebrow">Official paper practice · English only</p><h1>Prepare with every question.</h1><p class="hero-copy">1,205 MCQs from ADRE 2022 and 2024, with clear AI-powered answers and logic.</p></div><div class="hero-stat"><strong>10</strong><span>complete papers</span></div></section>
    <section class="workspace">
      <div class="mobile-paper-picker"><label for="paper-select">Practice paper</label><select id="paper-select">${state.papers.map((paper) => `<option value="${paper.id}" ${paper.id === state.paperId ? "selected" : ""}>${escapeHtml(paper.title.replace("ADRE ", ""))} · ${paper.count} questions</option>`).join("")}</select></div>
      <aside class="sidebar"><p class="section-label">Choose a paper</p><div class="paper-list">${state.papers.map((paper) => `<button class="paper ${paper.id === state.paperId ? "active" : ""}" data-paper="${paper.id}"><span>${escapeHtml(paper.title.replace("ADRE ", ""))}</span><small>${paper.count} questions</small></button>`).join("")}</div><div class="mini-score"><span>Current score</span><strong>${correct}<small> / ${answered}</small></strong></div></aside>
      <article class="quiz-card"><div class="quiz-meta"><span>${escapeHtml(question.paper)}</span><button data-action="navigator">Question ${state.index + 1} of ${set.length}</button></div><div class="progress"><span style="width:${((state.index + 1) / set.length) * 100}%"></span></div>
        <div class="question-area"><p class="question-number">Question ${question.number}</p><h2>${escapeHtml(question.question)}</h2><div class="options">${question.options.map((option, index) => {
          const classNames = ["option", state.selected === index ? "selected" : "", result?.correctIndex === index ? "correct" : "", result?.selected === index && result.correctIndex !== index ? "wrong" : ""].filter(Boolean).join(" ");
          const icon = result?.correctIndex === index ? "✓" : result?.selected === index && result.correctIndex !== index ? "×" : "";
          return `<button class="${classNames}" data-option="${index}" ${result ? "disabled" : ""}><span class="letter">${letters[index]}</span><span>${escapeHtml(option)}</span>${icon ? `<span class="state-icon">${icon}</span>` : ""}</button>`;
        }).join("")}</div>
        ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ""}
        ${result ? `<div class="explanation ${result.selected === result.correctIndex ? "right" : ""}"><p class="verdict">${result.selected === result.correctIndex ? "Correct answer" : `Correct answer: ${letters[result.correctIndex]}`}</p><h3>Why this is right</h3><p>${escapeHtml(result.explanation)}</p><div class="logic"><span>Logic</span><p>${escapeHtml(result.logic)}</p></div></div>` : ""}</div>
        <footer class="quiz-actions"><button class="secondary" data-action="previous" ${state.index === 0 ? "disabled" : ""}>← Previous</button>${result ? `<button class="primary" data-action="next" ${state.index === set.length - 1 ? "disabled" : ""}>Next question →</button>` : `<button class="primary" data-action="check" ${state.selected === null || state.loading ? "disabled" : ""}>${state.loading ? "Checking…" : "Check answer"}</button>`}</footer>
      </article>
    </section>
    ${state.navigator ? `<div class="modal-backdrop" data-action="close"><section class="navigator"><div class="navigator-head"><div><p class="section-label">Jump to</p><h2>${escapeHtml(question.paper)}</h2></div><button data-action="close">×</button></div><div class="question-grid">${set.map((item, index) => `<button data-jump="${index}" class="${index === state.index ? "current" : ""} ${state.results[item.id] ? "done" : ""}">${item.number}</button>`).join("")}</div></section></div>` : ""}`;
}

function go(index) { const set = currentSet(); state.index = Math.max(0, Math.min(set.length - 1, index)); state.selected = state.results[set[state.index].id]?.selected ?? null; state.error = ""; state.navigator = false; render(); window.scrollTo({ top: document.querySelector(".workspace").offsetTop - 12, behavior: "smooth" }); }

async function check() {
  if (state.selected === null || state.loading) return;
  const question = currentSet()[state.index]; state.loading = true; state.error = ""; render();
  try { const response = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not check the answer."); state.results[question.id] = { ...data, selected: state.selected }; }
  catch (error) { state.error = error.message || "Could not check the answer."; }
  finally { state.loading = false; render(); }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("button"); if (!target) return;
  if (target.dataset.option !== undefined) { state.selected = Number(target.dataset.option); render(); return; }
  if (target.dataset.paper) { state.paperId = target.dataset.paper; state.index = 0; state.selected = state.results[currentSet()[0].id]?.selected ?? null; state.error = ""; render(); return; }
  if (target.dataset.jump !== undefined) return go(Number(target.dataset.jump));
  const action = target.dataset.action;
  if (action === "check") check(); else if (action === "previous") go(state.index - 1); else if (action === "next") go(state.index + 1); else if (action === "navigator") { state.navigator = true; render(); } else if (action === "close") { state.navigator = false; render(); }
});

app.addEventListener("change", (event) => {
  if (event.target.id !== "paper-select") return;
  state.paperId = event.target.value;
  state.index = 0;
  state.selected = state.results[currentSet()[0].id]?.selected ?? null;
  state.error = "";
  render();
});

fetch("/data/questions.json").then((response) => response.json()).then((questions) => {
  state.questions = questions;
  const map = new Map(); questions.forEach((question) => map.set(question.paperId, { id: question.paperId, title: question.paper, count: (map.get(question.paperId)?.count || 0) + 1 }));
  state.papers = [...map.values()]; state.paperId = state.papers[0].id; render();
}).catch(() => { app.innerHTML = '<div class="error-box">Unable to load the quiz data.</div>'; });
