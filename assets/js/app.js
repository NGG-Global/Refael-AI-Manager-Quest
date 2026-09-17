/* ---------------------------------------------------------------------------
   Refael · LEAD AI — שאלון מוכנות אישי
   Application logic.

   Scoring follows § 4 of the specification exactly:
     · AI Coworker      — questions 1, 3, 5, 7, 9  → mean × 20
     · Human Leadership — questions 2, 4, 6, 8, 10 → mean × 20
     · קבלת החלטות והכרעה — questions 1–4  → mean × 20
     · הנעת אנשים וצוותים — questions 5–8  → mean × 20
     · שותפויות וממשקים   — questions 9–10 → mean × 20
   Strength is the highest-scoring lens area, growth focus the lowest; on a tie
   more than one area is shown (§ 4.2).
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  var C = CONTENT;

  var screens = {
    intro: document.getElementById('screen-intro'),
    quiz: document.getElementById('screen-quiz'),
    results: document.getElementById('screen-results')
  };
  var rafaelMark = document.getElementById('rafael-mark');

  var state = {
    index: 0,
    answers: C.questions.map(function () { return null; })
  };

  /* ── DOM helpers ──────────────────────────────────────────────────────── */

  var BOUND_PREFIX = /[\u05D0-\u05EA]-[A-Za-z][A-Za-z0-9]*/g;

  function setText(node, text) {
    var at = 0;
    var match;
    BOUND_PREFIX.lastIndex = 0;
    while ((match = BOUND_PREFIX.exec(text)) !== null) {
      if (match.index > at) {
        node.appendChild(document.createTextNode(text.slice(at, match.index)));
      }
      var keep = document.createElement('span');
      keep.className = 'nowrap';
      keep.textContent = match[0];
      node.appendChild(keep);
      at = match.index + match[0].length;
    }
    if (at === 0) { node.textContent = text; return node; }
    if (at < text.length) { node.appendChild(document.createTextNode(text.slice(at))); }
    return node;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { setText(node, text); }
    return node;
  }

  function append(parent, children) {
    children.forEach(function (child) { if (child) { parent.appendChild(child); } });
    return parent;
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ── Scoring ──────────────────────────────────────────────────────────── */

  function percent(values) {
    var sum = values.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / values.length) * 20);
  }

  function axisScore(key) {
    return percent(C.questions
      .filter(function (q) { return q.axis === key; })
      .map(function (q) { return state.answers[q.n - 1]; }));
  }

  function lensScore(key) {
    return percent(C.questions
      .filter(function (q) { return q.lens === key; })
      .map(function (q) { return state.answers[q.n - 1]; }));
  }

  function bandFor(axis, score) {
    for (var i = 0; i < axis.bands.length; i++) {
      if (score >= axis.bands[i].min) { return axis.bands[i]; }
    }
    return axis.bands[axis.bands.length - 1];
  }

  /* ── Ground ───────────────────────────────────────────────────────────── */
  /* One ground per screen, with the footer wordmark that belongs on it. */

  function setGround(ground) {
    document.body.setAttribute('data-ground', ground);
    rafaelMark.src = ground === 'navy'
      ? 'assets/img/logo-rafael-white.png'
      : 'assets/img/logo-rafael-blue.png';
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) { theme.setAttribute('content', ground === 'navy' ? '#00002c' : '#f8fafc'); }
  }

  function show(name, ground) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    setGround(ground);
    window.scrollTo(0, 0);
  }

  /* ── מסך פתיחה ────────────────────────────────────────────────────────── */

  function renderIntro() {
    var wrap = screens.intro.querySelector('.wrap');
    wrap.textContent = '';

    var title = el('h1', 't-title intro__title', C.title);
    title.id = 'intro-title';
    wrap.appendChild(title);

    var lead = el('div', 'stack');
    C.intro.lead.forEach(function (text) {
      lead.appendChild(el('p', 't-body', text));
    });
    wrap.appendChild(lead);

    var dims = el('ul', 'intro__dims');
    C.intro.dimensions.forEach(function (dim) {
      var li = el('li', 't-body');
      li.appendChild(el('span', 'term', dim.term));
      li.appendChild(setText(document.createDocumentFragment(), ' — ' + dim.text));
      dims.appendChild(li);
    });
    wrap.appendChild(dims);

    wrap.appendChild(el('p', 'intro__instruction', C.intro.instruction));

    /* The 1–5 scale, § 2 */
    var table = el('table', 'scale');
    var thead = el('thead');
    var headRow = el('tr');
    headRow.appendChild(el('th', null, C.intro.scaleHead.score));
    headRow.appendChild(el('th', null, C.intro.scaleHead.meaning));
    headRow.querySelectorAll('th').forEach(function (th) { th.scope = 'col'; });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    C.intro.scale.forEach(function (row) {
      var tr = el('tr');
      tr.appendChild(el('td', null, String(row.value)));
      tr.appendChild(el('td', null, row.meaning));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    var row = el('div', 'btn-row');
    var start = el('button', 'btn btn--primary', C.ui.start);
    start.type = 'button';
    start.addEventListener('click', function () {
      state.index = 0;
      show('quiz', 'mist');
      renderQuestion();
    });
    row.appendChild(start);
    wrap.appendChild(row);
  }

  /* ── שאלות השאלון ─────────────────────────────────────────────────────── */

  function renderQuestion() {
    var wrap = screens.quiz.querySelector('.wrap');
    var q = C.questions[state.index];
    var total = C.questions.length;
    var answered = state.answers.filter(function (a) { return a !== null; }).length;

    wrap.textContent = '';

    /* Progress */
    var progress = el('div', 'progress');
    progress.appendChild(el('span', 'progress__count', pad2(state.index + 1) + ' / ' + pad2(total)));
    var track = el('div', 'progress__track');
    var bar = el('div', 'progress__bar');
    bar.style.width = (answered / total * 100) + '%';
    track.appendChild(bar);
    progress.appendChild(track);
    wrap.appendChild(progress);

    /* The statement. § 3 — only the statement is shown, never its axis or lens. */
    var question = el('div', 'question');
    var text = el('h2', 'question__text', q.text);
    text.id = 'question-text';
    question.appendChild(text);
    wrap.appendChild(question);

    /* The 1–5 rating */
    var ratingBlock = el('div', 'rating-block');
    var rating = el('div', 'rating');
    rating.setAttribute('role', 'radiogroup');
    rating.setAttribute('aria-labelledby', 'question-text');

    C.intro.scale.forEach(function (option) {
      var button = el('button', 'rate', String(option.value));
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-label', option.value + ' — ' + option.meaning);
      var isChosen = state.answers[q.n - 1] === option.value;
      button.setAttribute('aria-checked', isChosen ? 'true' : 'false');
      button.tabIndex = isChosen || (state.answers[q.n - 1] === null && option.value === 1) ? 0 : -1;
      button.addEventListener('click', function () { choose(option.value); });
      button.addEventListener('keydown', onRatingKey);
      rating.appendChild(button);
    });
    ratingBlock.appendChild(rating);

    var anchors = el('div', 'anchors');
    anchors.appendChild(el('span', null, C.intro.scale[0].meaning));
    anchors.appendChild(el('span', null, C.intro.scale[C.intro.scale.length - 1].meaning));
    ratingBlock.appendChild(anchors);
    wrap.appendChild(ratingBlock);

    /* Navigation. Every question is required (§ 11): forward stays disabled
       until this statement is rated. */
    var row = el('div', 'btn-row');

    var back = el('button', 'btn btn--quiet', C.ui.back);
    back.type = 'button';
    back.addEventListener('click', function () {
      if (state.index === 0) {
        show('intro', 'navy');
      } else {
        state.index -= 1;
        renderQuestion();
      }
    });
    row.appendChild(back);

    var isLast = state.index === total - 1;
    var forward = el('button', 'btn btn--primary', isLast ? C.ui.submit : C.ui.next);
    forward.type = 'button';
    forward.disabled = state.answers[q.n - 1] === null;
    forward.addEventListener('click', advance);
    row.appendChild(forward);

    wrap.appendChild(row);
  }

  function onRatingKey(event) {
    var keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
    if (keys.indexOf(event.key) === -1) { return; }
    event.preventDefault();
    var buttons = Array.prototype.slice.call(this.parentNode.children);
    var at = buttons.indexOf(this);
    /* The row is laid out right-to-left, so ArrowRight steps back a value. */
    var step = (event.key === 'ArrowLeft' || event.key === 'ArrowDown') ? 1 : -1;
    var next = buttons[(at + step + buttons.length) % buttons.length];
    next.focus();
    next.click();
  }

  function choose(value) {
    var q = C.questions[state.index];
    state.answers[q.n - 1] = value;
    renderQuestion();
    /* The row is rebuilt, so focus has to be put back on the chosen circle.
       :focus-visible keeps the ring off for pointer users. */
    var chosen = screens.quiz.querySelector('.rate[aria-checked="true"]');
    if (chosen) { chosen.focus(); }
  }

  function advance() {
    if (state.index < C.questions.length - 1) {
      state.index += 1;
      renderQuestion();
      return;
    }
    if (state.answers.some(function (a) { return a === null; })) { return; }
    renderResults();
    show('results', 'mist');
    screens.results.focus();
  }

  /* ── מסך התוצאות ──────────────────────────────────────────────────────── */

  /* An isolated run: keeps a segment's own direction from reordering the
     segments around it inside the RTL line. Without a dir, <bdi> infers one
     from the first strong character, which turns "AI כשותף בעבודה" around. */
  function bdi(text, dir) {
    var node = document.createElement('bdi');
    if (dir) { node.dir = dir; }
    setText(node, text);
    return node;
  }

  function bandHeading(band) {
    var p = el('p', 'axis__band');
    p.appendChild(bdi(band.range));
    p.appendChild(document.createTextNode(' | '));
    p.appendChild(bdi(band.name, 'rtl'));
    return p;
  }

  function nextStep(text) {
    var p = el('p', 't-body next-step');
    p.appendChild(el('span', 'next-step__label', C.nextStepLabel));
    p.appendChild(setText(document.createDocumentFragment(), ' ' + text));
    return p;
  }

  function renderResults() {
    var wrap = screens.results.querySelector('.wrap');
    wrap.textContent = '';

    /* אזור 1 — שני ממדי-העל */
    var zone1 = el('section', 'zone');
    zone1.appendChild(el('h2', 't-title zone__heading', C.results.axesHeading));

    var axes = el('div', 'axes');
    C.axes.forEach(function (axis, i) {
      var score = axisScore(axis.key);
      var band = bandFor(axis, score);

      var block = el('article', 'axis');
      var disc = el('div', 'disc ' + (i === 0 ? 'disc--blue' : 'disc--ink'), score + '%');
      block.appendChild(disc);
      block.appendChild(el('p', 'axis__name', axis.name));
      block.appendChild(bandHeading(band));

      var body = el('div', 'axis__body axis__text');
      body.appendChild(el('p', 't-body', band.body));
      body.appendChild(nextStep(band.next));
      block.appendChild(body);

      axes.appendChild(block);
    });
    zone1.appendChild(axes);
    wrap.appendChild(zone1);

    /* אזור 2 — העדשה הרפאלית */
    var scores = C.lenses.map(function (lens) { return lensScore(lens.key); });
    var high = Math.max.apply(null, scores);
    var low = Math.min.apply(null, scores);

    var zone2 = el('section', 'zone');
    zone2.appendChild(el('h2', 't-title zone__heading', C.results.lensHeading));

    /* § 4.2 marks the highest-scoring area as the strength and the lowest as
       the growth focus, and allows more than one of each on a tie. When all
       three score the same there is no higher or lower area to mark, so the
       marks are left off and every action direction is shown instead. */
    var noSpread = high === low;

    var list = el('div', 'lenses');
    C.lenses.forEach(function (lens, i) {
      var score = scores[i];
      var isGrowth = score === low;

      var block = el('article', 'lens' + (isGrowth && !noSpread ? ' lens--growth' : ''));
      block.appendChild(el('div', 'lens__disc', score + '%'));
      block.appendChild(el('p', 'lens__name', lens.name));

      var tags = el('div', 'lens__tags');
      if (!noSpread) {
        if (score === high) { tags.appendChild(el('span', 'tag tag--strength', C.results.strengthLabel)); }
        if (isGrowth) { tags.appendChild(el('span', 'tag tag--growth', C.results.growthLabel)); }
      }
      block.appendChild(tags);

      list.appendChild(block);
    });
    zone2.appendChild(list);

    /* The growth focus and its action direction, § 8. On a tie the title is
       carried once and each tied area follows it. When all three score the
       same there is no lowest area, so the balanced reading takes its place. */
    var growth = el('div', 'growth');

    if (noSpread) {
      growth.appendChild(el('p', 'growth__title', C.balanced.title));
      var balanced = el('article');
      balanced.appendChild(el('p', 'growth__name', C.balanced.name));
      var balancedText = el('div', 'growth__text stack');
      balancedText.appendChild(el('p', 't-body', C.balanced.meaning));
      var action = el('p', 't-body');
      action.appendChild(el('span', 'next-step__label action-label', C.balanced.actionLabel));
      action.appendChild(setText(document.createDocumentFragment(), C.balanced.action));
      balancedText.appendChild(action);
      balanced.appendChild(balancedText);
      growth.appendChild(balanced);
    } else {
      growth.appendChild(el('p', 'growth__title', C.results.growthTitle));
      C.lenses.forEach(function (lens, i) {
        if (scores[i] !== low) { return; }
        var block = el('article');
        block.appendChild(el('p', 'growth__name', lens.name));
        var text = el('div', 'growth__text stack');
        text.appendChild(el('p', 't-body', lens.meaning));
        text.appendChild(el('p', 't-body', lens.action));
        block.appendChild(text);
        growth.appendChild(block);
      });
    }
    zone2.appendChild(growth);
    wrap.appendChild(zone2);

    /* אזור 3 — מכאן למפת הצמיחה שלי */
    var zone3 = el('section', 'zone closing');
    zone3.appendChild(el('h2', 't-title', C.closing.heading));
    zone3.appendChild(el('p', 'closing__question', C.closing.question));
    wrap.appendChild(zone3);

    var row = el('div', 'btn-row');
    var restart = el('button', 'btn btn--quiet', C.ui.restart);
    restart.type = 'button';
    restart.addEventListener('click', function () {
      state.index = 0;
      state.answers = C.questions.map(function () { return null; });
      show('intro', 'navy');
    });
    row.appendChild(restart);
    wrap.appendChild(row);
  }

  /* ── Start ────────────────────────────────────────────────────────────── */

  renderIntro();
  show('intro', 'navy');
})();
