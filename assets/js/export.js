/* ---------------------------------------------------------------------------
   Refael · LEAD AI — שאלון מוכנות אישי
   Taking the results out of the browser: as a PDF, or as an image.

   No library is used — the site has no build step and no dependencies, and it
   is meant to run without reaching the network. So neither route is the usual
   package:

     PDF — the browser's own print pipeline. It already lays these results out
           (the print rules are at the foot of styles.css), and it brings real
           text, correct Hebrew shaping and honest page breaks. A hand-written
           PDF writer would have to reimplement all three, and would get the
           bidi wrong.

     PNG — the results' own markup, placed in an SVG <foreignObject> and drawn
           to a canvas. An SVG being rendered as an image may not reach outside
           itself for a file, so the stylesheet, the fonts and the two logos
           have to travel with it as data URIs.

   Nothing is uploaded: the file is assembled in the page and handed straight
   to the browser's own download, which keeps § "Open points" of the README
   true — the answers still go nowhere.
--------------------------------------------------------------------------- */

var REPORT_EXPORT = (function () {
  'use strict';

  /* The width the results are laid out for — .wrap--wide is 62rem. */
  var IMAGE_WIDTH = 1080;
  /* Two device pixels per CSS pixel, so the text survives being zoomed into. */
  var IMAGE_SCALE = 2;
  /* Under every browser's own canvas ceiling, with room to spare. */
  var MAX_EDGE = 16000;

  /* The wrapper stands in for <html> and <body>; it takes their rules through
     retarget() below and only has to fix its own box on top. Animations are
     cut because a CSS animation renders at its first frame in a static image. */
  var EXPORT_CSS = [
    '.rx-root {',
    '  display: block; min-height: 0; width: ' + IMAGE_WIDTH + 'px;',
    '  direction: rtl; padding: 48px 0 40px;',
    '}',
    '.rx-root, .rx-root *, .rx-root *::before, .rx-root *::after {',
    '  animation: none !important; transition: none !important;',
    '}',
    '.rx-root .wrap { max-width: none; }',
    '.rx-root .brandbar { margin-block-start: 40px; }',
    '.rx-stamp {',
    '  margin-block-start: 32px; padding-block-start: 14px;',
    '  border-block-start: 1px solid rgba(0, 0, 48, 0.12);',
    '  text-align: center; font-size: var(--fs-footer); color: var(--text-footer);',
    '}'
  ].join('\n');

  /* ── The files ─────────────────────────────────────────────────────────── */

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* A local calendar date for the filename. toISOString is UTC and slips a day
     either side of midnight. */
  function stamp(date) {
    var day = date || new Date();
    return day.getFullYear() + '-' + pad2(day.getMonth() + 1) + '-' + pad2(day.getDate());
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  /* ── PDF ───────────────────────────────────────────────────────────────── */

  /* Opens the print dialog, where שמירה כ-PDF is the destination to pick.
     Chrome and Edge name the saved file after the document title, so the title
     carries the filename for as long as the dialog is up. */
  function savePdf(filename) {
    var title = document.title;
    var restored = false;

    function restore() {
      if (restored) { return; }
      restored = true;
      document.title = title;
      window.removeEventListener('afterprint', restore);
    }

    document.title = filename;
    window.addEventListener('afterprint', restore);
    window.print();
    /* Safari does not fire afterprint on the save-to-PDF path. */
    setTimeout(restore, 1500);
  }

  /* ── Assets ────────────────────────────────────────────────────────────── */

  /* Same-origin files read as data URIs, so they can travel inside the SVG. */
  var assetCache = {};

  function asDataUrl(url) {
    if (url.indexOf('data:') === 0) { return Promise.resolve(url); }
    if (assetCache[url]) { return assetCache[url]; }

    assetCache[url] = fetch(url)
      .then(function (response) {
        if (!response.ok) { throw new Error(response.status + ' ' + url); }
        return response.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () { resolve(String(reader.result)); };
          reader.onerror = function () { reject(reader.error || new Error(url)); };
          reader.readAsDataURL(blob);
        });
      });

    return assetCache[url];
  }

  /* ── The stylesheet ────────────────────────────────────────────────────── */

  /* Splits a selector list on its own commas, not on those inside :where(...). */
  function splitSelectors(text) {
    var parts = [];
    var depth = 0;
    var start = 0;
    var at;
    var character;

    for (at = 0; at < text.length; at += 1) {
      character = text.charAt(at);
      if (character === '(' || character === '[') { depth += 1; }
      else if (character === ')' || character === ']') { depth -= 1; }
      else if (character === ',' && depth === 0) { parts.push(text.slice(start, at)); start = at + 1; }
    }
    parts.push(text.slice(start));

    return parts.map(function (part) { return part.trim(); }).filter(Boolean);
  }

  var ROOT_ANCHOR = /^(?::root|html|body)(?![\w-])/;

  /* Gives any selector anchored on html, body or :root an .rx-root twin. Inside
     the SVG none of those three elements exists — the wrapper stands in for all
     of them — and in this design the ground tokens hang off body[data-ground],
     so without this the results would lose their colours as well as their type. */
  function retarget(selectorText) {
    var twins = splitSelectors(selectorText)
      .filter(function (part) { return ROOT_ANCHOR.test(part); })
      .map(function (part) { return part.replace(ROOT_ANCHOR, '.rx-root'); });

    return twins.length ? selectorText + ', ' + twins.join(', ') : selectorText;
  }

  /* The page's rules flattened to text, with the @font-face rules picked out. */
  function collectCss(rules, faces, out) {
    var i;
    var rule;
    var inner;

    for (i = 0; i < rules.length; i += 1) {
      rule = rules[i];
      if (rule instanceof CSSImportRule) {
        if (rule.styleSheet) { collectCss(rule.styleSheet.cssRules, faces, out); }
      } else if (rule instanceof CSSFontFaceRule) {
        faces.push(rule);
      } else if (rule instanceof CSSStyleRule) {
        out.push(retarget(rule.selectorText) + ' { ' + rule.style.cssText + ' }');
      } else if (rule instanceof CSSMediaRule) {
        /* Print rules would never match here, and the reduced-motion ones are
           already covered by the animation reset above. */
        if (rule.conditionText.indexOf('print') === -1) {
          inner = collectCss(rule.cssRules, faces, []);
          if (inner.length) { out.push('@media ' + rule.conditionText + ' {\n' + inner.join('\n') + '\n}'); }
        }
      } else {
        out.push(rule.cssText);
      }
    }
    return out;
  }

  var FONT_URL = /url\(["']?([^"')]+)["']?\)/;

  /* The @font-face rules with their files carried inline. */
  function inlineFontFaces(faces) {
    return Promise.all(faces.map(function (rule) {
      var found = rule.style.getPropertyValue('src').match(FONT_URL);
      var base;
      if (!found) { return ''; }
      base = (rule.parentStyleSheet && rule.parentStyleSheet.href) || document.baseURI;

      return asDataUrl(new URL(found[1], base).href)
        .then(function (data) {
          return rule.cssText.replace(found[1], function () { return data; });
        })
        /* Better a system face in the image than no image at all. */
        .catch(function () { return ''; });
    })).then(function (parts) { return parts.filter(Boolean); });
  }

  /* The page's stylesheet as one string, ready to sit inside the SVG. */
  function exportStylesheet() {
    var faces = [];
    var body = [];
    var i;

    for (i = 0; i < document.styleSheets.length; i += 1) {
      try {
        collectCss(document.styleSheets[i].cssRules, faces, body);
      } catch (error) {
        /* a sheet we may not read */
      }
    }

    return inlineFontFaces(faces).then(function (inlined) {
      return inlined.join('\n') + '\n' + body.join('\n') + '\n' + EXPORT_CSS;
    });
  }

  /* ── The clone ─────────────────────────────────────────────────────────── */

  /* Rewrites every <img> to a data URI; an SVG image cannot fetch one itself. */
  function inlineImages(node) {
    var images = Array.prototype.slice.call(node.querySelectorAll('img'));

    return Promise.all(images.map(function (image) {
      return asDataUrl(new URL(image.getAttribute('src'), document.baseURI).href)
        .then(function (data) { image.setAttribute('src', data); })
        .catch(function () { image.parentNode.removeChild(image); });
    }));
  }

  /* The results as they should look on their own: no controls, the co-branded
     footer kept, and the date it was produced added, since an image loses the
     page around it. */
  function prepareClone(sources, ground, caption) {
    var root = document.createElement('div');
    root.className = 'rx-root';
    root.dir = 'rtl';
    /* The ground tokens hang off this attribute; retarget() moves them here. */
    root.setAttribute('data-ground', ground);

    sources.forEach(function (source) {
      var clone = source.cloneNode(true);
      Array.prototype.slice.call(clone.querySelectorAll('[data-export="skip"], .motif'))
        .forEach(function (node) { node.parentNode.removeChild(node); });
      clone.removeAttribute('hidden');
      root.appendChild(clone);
    });

    if (caption) {
      var line = document.createElement('p');
      line.className = 'rx-stamp';
      line.textContent = caption;
      root.appendChild(line);
    }

    return inlineImages(root).then(function () { return root; });
  }

  /* Lays the export out at its real width and reports the height.

     An iframe rather than a hidden div, because the type sizes and the gutter
     are clamped against vw: they only come out at the size the image will use
     in a viewport that is the width the image will be. Same markup and same
     stylesheet as the SVG gets, so the measurement is the render. */
  function measureHeight(markup, css) {
    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed; left:-20000px; top:0; width:' + IMAGE_WIDTH
      + 'px; height:100px; border:0; visibility:hidden;';
    document.body.appendChild(frame);

    var doc = frame.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>'
      + css + '</style></head><body style="margin:0">' + markup + '</body></html>');
    doc.close();

    return Promise.resolve(doc.fonts && doc.fonts.ready).then(function () {
      var laid = doc.body.firstElementChild;
      var height = Math.ceil(laid ? laid.getBoundingClientRect().height : 0);
      frame.parentNode.removeChild(frame);
      return height;
    });
  }

  /* ── The image ─────────────────────────────────────────────────────────── */

  var XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

  function escapeXml(text) {
    return text.replace(/[&<>]/g, function (character) { return XML_ESCAPES[character]; });
  }

  function svgDocument(markup, css, width, height) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height
      + '" viewBox="0 0 ' + width + ' ' + height + '">'
      + '<style>' + escapeXml(css) + '</style>'
      + '<foreignObject x="0" y="0" width="' + width + '" height="' + height + '">'
      + markup + '</foreignObject></svg>';
  }

  function drawSvg(svg, width, height) {
    return new Promise(function (resolve, reject) {
      var image = new Image();

      image.onload = function () {
        var scale = Math.min(IMAGE_SCALE, MAX_EDGE / Math.max(width, height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        var context = canvas.getContext('2d');
        context.scale(scale, scale);
        /* The results' own ground is opaque, but PNG is not; paint under it. */
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas);
      };
      image.onerror = function () { reject(new Error('the results could not be rendered to an image')); };
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /* Saves `sources` as one PNG. Rejects if the browser refused to rasterise,
     which the caller should say out loud rather than swallow. */
  function saveImage(options) {
    var markup;
    var stylesheet;

    return exportStylesheet()
      .then(function (css) {
        stylesheet = css;
        return prepareClone(options.sources, options.ground, options.caption);
      })
      .then(function (root) {
        markup = new XMLSerializer().serializeToString(root);
        return measureHeight(markup, stylesheet);
      })
      .then(function (height) {
        if (!height) { throw new Error('the results measured as empty'); }
        return drawSvg(svgDocument(markup, stylesheet, IMAGE_WIDTH, height), IMAGE_WIDTH, height);
      })
      .then(function (canvas) {
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (blob) { resolve(blob); } else { reject(new Error('the image could not be encoded')); }
          }, 'image/png');
        });
      })
      .then(function (blob) { downloadBlob(blob, options.filename); });
  }

  return {
    stamp: stamp,
    savePdf: savePdf,
    saveImage: saveImage
  };
})();
