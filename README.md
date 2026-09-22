# מנהל/ת בעידן ה-AI | שאלון מוכנות אישי – רפאל

A self-paced readiness questionnaire for Rafael managers, delivered by NGG as part
of the LEAD AI programme. Ten statements rated 1–5 produce two headline scores —
**AI Coworker** and **Human Leadership** — plus three Rafael-lens indicators and a
personal next step.

Static site: HTML, CSS and vanilla JavaScript, no build step and no dependencies.
Hebrew, right-to-left, responsive from 320 px upward.

---

## Content

Every participant-facing string comes from the source specification
*"מנהל/ת בעידן ה-AI | שאלון מוכנות אישי – רפאל — מסמך אפיון למפתח"* and is
reproduced verbatim. It lives in one place, `assets/js/content.js`, so it can be
checked against the document without reading any logic. Section numbers in the
comments there refer to that document.

The only strings that are not from the document are the navigation labels at the
end of `content.js` (`להתחלת השאלון`, `חזרה`, `הבא`, `לצפייה בתוצאות`,
`התחלה מחדש`), which a self-paced form cannot do without, and the labels on the
two save buttons below them, which the document does not reach.

## Scoring

Implemented in `assets/js/app.js`, per § 4 of the specification.

| Measure | Questions | Calculation |
| --- | --- | --- |
| AI Coworker | 1, 3, 5, 7, 9 | mean × 20 |
| Human Leadership | 2, 4, 6, 8, 10 | mean × 20 |
| קבלת החלטות והכרעה | 1–4 | mean × 20 |
| הנעת אנשים וצוותים | 5–8 | mean × 20 |
| שותפויות וממשקים | 9–10 | mean × 20 |

Bands: **80 %–100 %**, **60 %–79 %**, **up to 59 %**. Because each score is a mean
of integers multiplied by 20, no reachable score falls between 79 and 80.

The highest-scoring lens area is marked חוזקה and the lowest מוקד צמיחה; on a tie
every area at that score is marked, and each one's action direction is shown
(§ 4.2). When all three score the same there is no higher or lower area, so no
circle is marked and the balanced reading — *חיבור בין היכולות*, supplied by
Rafael and held in `content.js` as `balanced` — takes the place of the three
action directions.

Questions are compulsory and are presented one per screen: the forward step stays
inactive until the statement on screen is rated. The axis and lens each statement
belongs to are never shown while answering (§ 3, § 11).

## Saving the results

The results screen offers two ways to keep them, and a note under the buttons
saying what both do: *הקובץ נוצר בדפדפן ואינו נשלח לשום מקום.*

**שמירה כ-PDF** opens the browser's print dialog, where *שמירה כ-PDF* is the
destination to choose. The print rules at the foot of `styles.css` are what the
file looks like: on screen the page is a flex column that fills the viewport and
the screen itself clips, which printed would put everything on page one, so paper
gets the block layout, the wide two-up axes and fixed stat-circle sizes. The
document title carries the filename while the dialog is up, which is what Chrome
and Edge name the saved file after.

**שמירה כתמונה** saves one PNG of the results, laid out at 1080 px and rendered
at two device pixels per CSS pixel. The buttons are left out, the co-branded
footer is kept, and the date it was produced is added at the foot.

Neither uses a library — the site has no build step and no dependencies, and is
meant to run without reaching the network, which rules out the usual
html-to-canvas and PDF packages. So the two routes are:

| | How |
|---|---|
| PDF | `window.print()`. The browser brings real text, correct Hebrew shaping and honest page breaks — all three of which a hand-written PDF writer would have to reimplement, and would get the bidi wrong. |
| PNG | The results' own markup inside an SVG `<foreignObject>`, drawn to a canvas. An SVG being rendered as an image may not reach outside itself for a file, so the stylesheet, the fonts and the two logos travel with it as data URIs. |

`assets/js/export.js` holds both. Two details in it are worth knowing before
changing it:

- **`html`, `body` and `:root` do not exist inside an SVG.** One wrapper stands
  in for all three, and every rule anchored on them is given a twin that targets
  it. That matters more here than it might: the ground tokens hang off
  `body[data-ground]`, so without it the results would lose their colours as
  well as their type.
- **The height is measured in an iframe of the export's own width.** The type
  sizes, the gutter and the stat circles are clamped against `vw`, so they only
  come out at the size the image will use in a viewport that is the width the
  image will be.

Nothing is uploaded either way: the file is assembled in the page and handed
straight to the browser's own download, which leaves *Open points* below true.

## Design

Built on the **Rafael LEAD AI design system**. Taken from it unchanged: the four
brand colours and their text pairings, Assistant at four weights, the 0.9 display
leading, the type-size ratios, the comet motif at its exact 273 : 89 : 93
proportions and its eight permitted rotations, the allowed radii (50 %, stadium,
92 px, 0), one ground per screen with the wordmark that belongs on it, and the
co-branded NGG + Rafael footer on every screen. No borders, no shadows, no
transparency on content, no gradient grounds.

Logos and fonts are copies of the system's own files. The Rafael and NGG marks
were cropped to their artwork — a lossless removal of transparent padding only.

### Adaptations

That system is a 1920 × 1080 presentation template. It states that it contains no
buttons, links, inputs or hover states, and that interactive UI for LEAD AI is new
design work. The following were therefore decided here and are marked `ADAPTED` in
`assets/css/styles.css`:

1. **Type scale.** The system's ratios (88 : 64 : 48 : 40 : 36 : 24 against a 36 px
   body) are kept exactly, anchored to a screen-reading body size instead of the
   projector's.
2. **Body leading.** 0.9 is kept on every display style — it is the system's
   strongest signature — but running paragraphs are set at 1.55. At 0.9 a
   multi-line Hebrew paragraph is not legible on screen.
3. **Rating and score circles.** These use the template's stat-circle device: a
   50 % circle filled `--blue` or `--ink`, its two fills. An unrated circle is
   `--ink` and turns `--blue` when rated.
4. **Buttons.** Stadium-shaped, the system's own trail and orb-pill radius. The
   inactive forward step drops to `--ink-muted` text with no fill rather than
   introducing a colour the system does not have.
5. **Focus ring.** A visible outline on keyboard focus. Required for
   accessibility; the system specifies no focus treatment.
6. **Motion.** Only a plain 0.2 s colour fade on the circles and buttons, which the
   system permits as an addition. Switching grounds is instant.
7. **Footer.** The logo pair is centred rather than set at the left of the footer
   row, for symmetry at every width. The pair itself is unchanged.
8. **Motif placement.** The comets sit in corners the copy never reaches at any
   width. The one in the wide side margin appears only from 1024 px, where that
   margin exists.

## Layout

| File | |
| --- | --- |
| `index.html` | Shell: three screens, the motif and the footer |
| `assets/js/content.js` | All copy and the question → axis/lens mapping |
| `assets/js/export.js` | Saving the results as a PDF or a PNG |
| `assets/js/app.js` | Scoring, rendering, navigation |
| `assets/css/styles.css` | Tokens and styles |
| `assets/fonts/` | Assistant (woff2), from the design system |
| `assets/img/` | NGG mark, Rafael wordmark in blue and white |

## Running it locally

Any static server, from the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The fonts are loaded by relative path, so
opening `index.html` straight from the filesystem also works.

## Deployment

`.github/workflows/deploy-pages.yml` publishes the repository root to GitHub Pages
on every push to `main` or to the development branch, and can be run by hand from
the Actions tab.

**One setting has to be made by a repository admin before the first deploy.**
The workflow asks GitHub to turn Pages on, and GitHub refuses that to a workflow
token:

```
Get Pages site failed. Error: Not Found
Create Pages site failed. Error: Resource not accessible by integration
```

Set **Settings → Pages → Source** to **GitHub Actions** — not *Deploy from a
branch*, which the workflow cannot publish to — then re-run the workflow from the
Actions tab. Every later push deploys on its own.

GitHub may also restrict the `github-pages` deployment environment to the
repository's default branch. If the deploy step is refused on that ground after
Pages is on, merge this branch into `main`; the workflow runs there too.

## Open points

- **Results are not stored.** Nothing is sent anywhere and nothing is kept: a
  reload clears the answers, and the PDF and PNG are built in the page rather
  than on a server. A participant who wants to keep their results has to save
  one of the two files before reloading. If results need to be retained or
  aggregated, that is a separate requirement with its own privacy handling.
