// ==UserScript==
// @name         Markdown Toolbar — Planète Warez
// @namespace    https://planete-warez.net/
// @version      2.1.0
// @description  Barre Markdown : spoilers, émojis, libellés masquables, tableaux, raccourcis et aperçu sécurisé.
// @author       Aerya
// @match        https://planete-warez.net/*
// @grant        none
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js
// ==/UserScript==

(function () {
    'use strict';

    const NS = 'aerya-mdtb';
    let pickerSerial = 0;
    const LABELS_STORAGE_KEY = 'aerya-mdtb.show-labels';
    const svg = (content) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
    const icons = {
        bold: svg('<path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z"/>'),
        italic: svg('<path d="M14 4h6M4 20h6M15 4 9 20"/>'),
        strike: svg('<path d="M16 5a5 5 0 0 0-9 3c0 5 10 2 10 8a5 5 0 0 1-10 3M4 12h16"/>'),
        link: svg('<path d="M10 13a5 5 0 0 0 7 .4l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.4l-3 3a5 5 0 0 0 7 7l2-2"/>'),
        image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
        code: svg('<path d="m8 8-4 4 4 4m8-8 4 4-4 4"/>'),
        codeblock: svg('<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m9 9-3 3 3 3m6-6 3 3-3 3"/>'),
        quote: svg('<path d="M10 11H5a3 3 0 0 1 3-3V5a6 6 0 0 0-6 6v7h8zm12 0h-5a3 3 0 0 1 3-3V5a6 6 0 0 0-6 6v7h8z"/>'),
        spoiler: svg('<path d="M3 5h18v14H3zM7 9h10M7 13h7M7 17h3"/><path d="m4 3 16 18"/>'),
        emoji: svg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M8 9h.01M16 9h.01"/>'),
        bullets: svg('<circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/><path d="M9 6h12M9 12h12M9 18h12"/>'),
        numbered: svg('<path d="M3 6h2V3L3 4M3 11h2v3H3l2-3M3 18h2v3H3l2-3M9 6h12M9 12h12M9 18h12"/>'),
        tasks: svg('<rect x="2" y="4" width="5" height="5" rx="1"/><path d="m3 6 1 1 3-3M11 6h11M2 15h5v5H2zM11 17h11"/>'),
        table: svg('<rect x="2" y="3" width="20" height="18" rx="1"/><path d="M2 9h20M2 15h20M9 3v18M16 3v18"/>'),
        line: svg('<path d="M3 12h18"/>'),
        center: svg('<path d="M3 6h18M7 10h10M3 14h18M7 18h10"/>'),
        eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
        eyeoff: svg('<path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.4 4.1M6.3 6.3A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 4-.9"/>')
    };

    const groups = [
        [
            { action: 'bold', label: 'Gras', icon: 'bold', help: 'Gras — Ctrl+B' },
            { action: 'italic', label: 'Italique', icon: 'italic', help: 'Italique — Ctrl+I' },
            { action: 'strike', label: 'Barré', icon: 'strike', help: 'Texte barré (~~texte~~)' },
            { action: 'h2', label: 'Titre H2', glyph: 'H2', help: 'Titre de niveau 2' },
            { action: 'h3', label: 'Titre H3', glyph: 'H3', help: 'Titre de niveau 3' }
        ],
        [
            { action: 'link', label: 'Lien', icon: 'link', help: 'Créer un lien — Ctrl+K' },
            { action: 'image', label: 'Image', icon: 'image', help: 'Insérer une image par URL' },
            { action: 'code', label: 'Code', icon: 'code', help: 'Code dans une ligne' },
            { action: 'codeblock', label: 'Bloc code', icon: 'codeblock', help: 'Bloc de code sur plusieurs lignes' },
            { action: 'quote', label: 'Citation', icon: 'quote', help: 'Mettre les lignes en citation' },
            { action: 'spoiler', label: 'Spoiler', icon: 'spoiler', help: 'Masquer le texte avec >! (extension Spoilers de NodeBB requise)' },
            { action: 'table', label: 'Tableau', icon: 'table', help: 'Insérer un tableau Markdown' }
        ],
        [
            { action: 'bullets', label: 'Puces', icon: 'bullets', help: 'Liste à puces' },
            { action: 'numbered', label: 'Numéros', icon: 'numbered', help: 'Liste numérotée' },
            { action: 'tasks', label: 'Cases', icon: 'tasks', help: 'Liste de tâches à cocher' }
        ],
        [
            { action: 'center', label: 'Centrer', icon: 'center', help: 'Centrer avec HTML (si autorisé par le forum)' },
            { action: 'line', label: 'Séparateur', icon: 'line', help: 'Insérer une ligne horizontale' }
        ]
    ];

    const emojiGroups = [
        { label: 'Visages', items: [
            ['😀', 'sourire joyeux'], ['😄', 'grand sourire'], ['😁', 'sourire dents'], ['😂', 'rire aux larmes'],
            ['🤣', 'mort de rire'], ['😊', 'sourire timide'], ['😉', 'clin d’œil'], ['😍', 'amoureux yeux cœur'],
            ['😘', 'bisou'], ['😎', 'lunettes cool'], ['🤔', 'réfléchir'], ['🙄', 'lever les yeux'],
            ['😢', 'triste'], ['😭', 'pleurer'], ['😡', 'colère'], ['😱', 'surprise peur'],
            ['🥳', 'fête'], ['😴', 'dormir'], ['🤯', 'cerveau explosion'], ['🤩', 'admiratif']
        ] },
        { label: 'Gestes', items: [
            ['👍', 'pouce haut oui'], ['👎', 'pouce bas non'], ['👏', 'applaudir'], ['🙌', 'bravo mains levées'],
            ['🙏', 'merci prière'], ['👌', 'parfait ok'], ['✌️', 'victoire'], ['🤝', 'poignée de main'],
            ['💪', 'force muscle'], ['👀', 'regarder yeux'], ['🤷', 'hausser épaules'], ['🤦', 'facepalm'],
            ['🫶', 'mains cœur']
        ] },
        { label: 'Symboles', items: [
            ['❤️', 'cœur rouge amour'], ['💙', 'cœur bleu'], ['💚', 'cœur vert'], ['💔', 'cœur brisé'],
            ['🔥', 'flamme feu'], ['⭐', 'étoile'], ['✨', 'briller étincelles'], ['✅', 'validé coche'],
            ['❌', 'croix erreur'], ['⚠️', 'attention'], ['❗', 'exclamation'], ['❓', 'question'],
            ['💯', 'cent parfait'], ['🎉', 'confettis fête'], ['🚀', 'fusée'], ['💡', 'idée ampoule']
        ] },
        { label: 'Divers', items: [
            ['🎬', 'cinéma film'], ['🎵', 'musique note'], ['🎧', 'casque audio'], ['🖥️', 'écran ordinateur'],
            ['💻', 'portable ordinateur'], ['📱', 'téléphone'], ['🔗', 'lien chaîne'], ['📷', 'photo appareil'],
            ['📌', 'épingle'], ['📢', 'annonce'], ['📰', 'journal actualité'], ['💬', 'discussion'],
            ['🔒', 'verrou fermé'], ['🔓', 'verrou ouvert'], ['👻', 'fantôme'], ['🏆', 'trophée']
        ] }
    ];

    function labelsVisible() {
        try { return localStorage.getItem(LABELS_STORAGE_KEY) !== 'false'; }
        catch (_) { return true; }
    }

    function setLabelsVisible(visible) {
        try { localStorage.setItem(LABELS_STORAGE_KEY, String(visible)); }
        catch (_) { /* Le mode privé peut bloquer le stockage : la session reste utilisable. */ }
        for (const bar of document.querySelectorAll(`.${NS}`)) {
            bar.classList.toggle(`${NS}-compact`, !visible);
            const toggle = bar.querySelector(`.${NS}-labels-button`);
            if (!toggle) continue;
            toggle.setAttribute('aria-pressed', String(visible));
            const title = visible ? 'Masquer les textes des boutons' : 'Afficher les textes des boutons';
            toggle.title = title;
            toggle.setAttribute('aria-label', title);
            toggle.querySelector(`.${NS}-label`).textContent = visible ? 'Masquer textes' : 'Afficher textes';
        }
    }

    function insert(field, from, to, replacement, selectionFrom, selectionTo) {
        const oldScroll = field.scrollTop;
        field.setRangeText(replacement, from, to, 'end');
        field.focus();
        field.setSelectionRange(selectionFrom, selectionTo);
        field.scrollTop = oldScroll;
        field.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function inline(field, marker, placeholder) {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const selected = field.value.slice(start, end);
        if (selected && selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
            const inner = selected.slice(marker.length, -marker.length);
            insert(field, start, end, inner, start, start + inner.length);
            return;
        }
        const content = selected || placeholder;
        // Un code composé uniquement de backticks exige une espace de garde en Markdown.
        const padding = marker[0] === '`' && (content.startsWith('`') || content.endsWith('`')) ? ' ' : '';
        const rendered = marker + padding + content + padding + marker;
        const cursorStart = start + marker.length + padding.length;
        insert(field, start, end, rendered, cursorStart, cursorStart + content.length);
    }

    function linkOrImage(field, isImage) {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const selected = field.value.slice(start, end).trim();
        const isUrl = /^https?:\/\/\S+$/i.test(selected);
        const label = isImage ? (selected && !isUrl ? selected : 'description') : (selected && !isUrl ? selected : 'texte du lien');
        const url = isUrl ? selected : 'https://';
        const markup = `${isImage ? '!' : ''}[${label}](${url})`;
        const editLabel = !selected || isUrl;
        const offset = isImage ? 2 : 1;
        const selectionStart = start + (editLabel ? offset : offset + label.length + 2);
        const selectionEnd = selectionStart + (editLabel ? label.length : url.length);
        insert(field, start, end, markup, selectionStart, selectionEnd);
    }

    function changeLines(field, action) {
        const original = field.value;
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const lineStart = original.lastIndexOf('\n', start - 1) + 1;
        const lastChar = end > start && original[end - 1] === '\n' ? end - 1 : end;
        const newlineIndex = original.indexOf('\n', lastChar);
        const lineEnd = newlineIndex < 0 ? original.length : newlineIndex;
        const lines = original.slice(lineStart, lineEnd).split('\n');
        const nonblank = lines.filter(line => line.trim().length);
        const patterns = {
            h2: /^\s*##\s+/, h3: /^\s*###\s+/, quote: /^\s*>\s?/, spoiler: /^\s*>!\s?/,
            bullets: /^\s*[-+*]\s+(?!\[[ xX]\]\s)/,
            numbered: /^\s*\d+\.\s+/, tasks: /^\s*-\s+\[[ xX]\]\s+/
        };
        const allMarked = nonblank.length && nonblank.every(line => patterns[action].test(line));
        let counter = 0;
        const result = lines.map(line => {
            if (!line.trim() && start !== end) return line;
            if (allMarked) return line.replace(patterns[action], (match) => /^\s*/.exec(match)[0]);
            const indent = /^\s*/.exec(line)[0];
            let body = line.slice(indent.length);
            if (action === 'h2' || action === 'h3') body = body.replace(/^#{1,6}\s+/, '');
            if (['bullets', 'numbered', 'tasks'].includes(action)) body = body.replace(/^(?:[-+*]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/, '');
            const prefixes = {
                h2: '## ', h3: '### ', quote: '> ', spoiler: '>! ', bullets: '- ',
                numbered: `${++counter}. `, tasks: '- [ ] '
            };
            return indent + prefixes[action] + body;
        }).join('\n');
        if (start === end) {
            const cursor = Math.max(lineStart, Math.min(lineStart + result.length, start + result.length - (lineEnd - lineStart)));
            insert(field, lineStart, lineEnd, result, cursor, cursor);
        } else {
            insert(field, lineStart, lineEnd, result, lineStart, lineStart + result.length);
        }
    }

    function block(field, content, placeholder) {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const before = field.value.slice(0, start);
        const after = field.value.slice(end);
        const leading = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const trailing = !after ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
        const result = leading + content + trailing;
        const index = placeholder ? result.indexOf(placeholder) : result.length;
        const caret = start + Math.max(0, index);
        insert(field, start, end, result, caret, caret + (placeholder ? placeholder.length : 0));
    }

    function apply(field, action) {
        if (field.disabled || field.readOnly) return;
        switch (action) {
            case 'bold': inline(field, '**', 'texte en gras'); break;
            case 'italic': inline(field, '*', 'texte en italique'); break;
            case 'strike': inline(field, '~~', 'texte barré'); break;
            case 'code': {
                const selected = field.value.slice(field.selectionStart, field.selectionEnd);
                if (selected.includes('\n')) apply(field, 'codeblock');
                else inline(field, '`'.repeat(Math.max(1, ...Array.from(selected.matchAll(/`+/g), match => match[0].length + 1))), 'code');
                break;
            }
            case 'link': linkOrImage(field, false); break;
            case 'image': linkOrImage(field, true); break;
            case 'h2': case 'h3': case 'quote': case 'spoiler': case 'bullets': case 'numbered': case 'tasks':
                changeLines(field, action); break;
            case 'center': {
                const start = field.selectionStart;
                const end = field.selectionEnd;
                const text = field.value.slice(start, end) || 'texte à centrer';
                const prefix = '<div align="center">\n';
                const suffix = '\n</div>';
                insert(field, start, end, prefix + text + suffix, start + prefix.length, start + prefix.length + text.length);
                break;
            }
            case 'codeblock': {
                const selected = field.value.slice(field.selectionStart, field.selectionEnd);
                const placeholder = selected || 'ton code ici';
                const longestFence = Math.max(2, ...Array.from(placeholder.matchAll(/`+/g), match => match[0].length));
                const fence = '`'.repeat(longestFence + 1);
                block(field, `${fence}\n${placeholder}\n${fence}`, placeholder);
                break;
            }
            case 'table':
                block(field, '| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Cellule 1 | Cellule 2 |', 'Colonne 1');
                break;
            case 'line': block(field, '---'); break;
        }
    }

    function makeButton(definition, field) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `${NS}-button`;
        button.title = definition.help;
        button.setAttribute('aria-label', definition.help);
        const symbol = document.createElement('span');
        symbol.className = `${NS}-symbol`;
        if (definition.icon) symbol.innerHTML = icons[definition.icon];
        else symbol.textContent = definition.glyph;
        const label = document.createElement('span');
        label.className = `${NS}-label`;
        label.textContent = definition.label;
        button.append(symbol, label);
        button.addEventListener('mousedown', event => event.preventDefault());
        if (definition.action) button.addEventListener('click', () => apply(field, definition.action));
        return button;
    }

    function makeEmojiPicker(field) {
        const panel = document.createElement('div');
        panel.className = `${NS}-emoji-panel`;
        panel.hidden = true;
        panel.id = `${NS}-emoji-${++pickerSerial}`;

        const search = document.createElement('input');
        search.type = 'search';
        search.className = `${NS}-emoji-search`;
        search.placeholder = 'Rechercher un émoji…';
        search.setAttribute('aria-label', 'Rechercher un émoji');
        panel.appendChild(search);

        const sections = [];
        for (const group of emojiGroups) {
            const section = document.createElement('div');
            section.className = `${NS}-emoji-section`;
            const heading = document.createElement('div');
            heading.className = `${NS}-emoji-heading`;
            heading.textContent = group.label;
            const grid = document.createElement('div');
            grid.className = `${NS}-emoji-grid`;
            const items = [];

            for (const [character, description] of group.items) {
                const emoji = document.createElement('button');
                emoji.type = 'button';
                emoji.className = `${NS}-emoji`;
                emoji.textContent = character;
                emoji.title = description;
                emoji.setAttribute('aria-label', description);
                emoji.addEventListener('mousedown', event => event.preventDefault());
                emoji.addEventListener('click', () => {
                    const start = field.selectionStart;
                    const end = field.selectionEnd;
                    insert(field, start, end, character, start + character.length, start + character.length);
                });
                grid.appendChild(emoji);
                items.push({ button: emoji, searchText: `${character} ${description}` });
            }
            section.append(heading, grid);
            panel.appendChild(section);
            sections.push({ section, items });
        }

        const empty = document.createElement('span');
        empty.className = `${NS}-emoji-empty`;
        empty.textContent = 'Aucun émoji trouvé.';
        empty.hidden = true;
        panel.appendChild(empty);

        const simplify = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
        search.addEventListener('input', () => {
            const query = simplify(search.value.trim());
            let shown = 0;
            for (const { section, items } of sections) {
                let count = 0;
                for (const item of items) {
                    const match = simplify(item.searchText).includes(query);
                    item.button.hidden = !match;
                    if (match) count++;
                }
                section.hidden = !count;
                shown += count;
            }
            empty.hidden = shown !== 0;
        });
        return { panel, search };
    }

    function attach(field) {
        if (field.dataset.aeryaMarkdownToolbar) return;
        field.dataset.aeryaMarkdownToolbar = '2.1';

        const bar = document.createElement('div');
        bar.className = NS;
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Mise en forme Markdown');

        for (const definitions of groups) {
            const group = document.createElement('div');
            group.className = `${NS}-group`;
            for (const definition of definitions) group.appendChild(makeButton(definition, field));
            bar.appendChild(group);
        }

        const emojiButton = makeButton({ label: 'Émojis', icon: 'emoji', help: 'Choisir un émoji à insérer' }, field);
        emojiButton.setAttribute('aria-expanded', 'false');
        const { panel: emojiPanel, search: emojiSearch } = makeEmojiPicker(field);
        emojiButton.setAttribute('aria-controls', emojiPanel.id);
        bar.appendChild(emojiButton);

        const labelsButton = makeButton({ label: 'Masquer textes', glyph: 'Aa', help: 'Masquer les textes des boutons' }, field);
        labelsButton.classList.add(`${NS}-labels-button`);
        labelsButton.querySelector(`.${NS}-label`).classList.add(`${NS}-keep-label`);
        bar.appendChild(labelsButton);

        const previewButton = makeButton({ label: 'Aperçu', icon: 'eye', help: 'Afficher la prévisualisation Markdown' }, field);
        previewButton.classList.add(`${NS}-preview-button`);
        previewButton.setAttribute('aria-expanded', 'false');
        bar.appendChild(previewButton);
        bar.appendChild(emojiPanel);

        bar.classList.toggle(`${NS}-compact`, !labelsVisible());
        labelsButton.setAttribute('aria-pressed', String(labelsVisible()));
        if (!labelsVisible()) {
            labelsButton.title = 'Afficher les textes des boutons';
            labelsButton.setAttribute('aria-label', labelsButton.title);
            labelsButton.querySelector(`.${NS}-label`).textContent = 'Afficher textes';
        }
        labelsButton.addEventListener('click', () => {
            setLabelsVisible(bar.classList.contains(`${NS}-compact`));
        });

        function closeEmojiPicker() {
            emojiPanel.hidden = true;
            emojiButton.setAttribute('aria-expanded', 'false');
        }
        emojiButton.addEventListener('click', () => {
            const opening = emojiPanel.hidden;
            emojiPanel.hidden = !opening;
            emojiButton.setAttribute('aria-expanded', String(opening));
            if (opening) emojiSearch.focus();
        });
        emojiPanel.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeEmojiPicker();
                field.focus();
            }
        });
        document.addEventListener('pointerdown', event => {
            if (!bar.contains(event.target)) closeEmojiPicker();
        });

        const preview = document.createElement('section');
        preview.className = `${NS}-preview`;
        preview.hidden = true;
        preview.setAttribute('aria-label', 'Prévisualisation Markdown');

        function refreshPreview() {
            if (preview.hidden) return;
            if (window.marked && window.DOMPurify) {
                const html = window.marked.parse(field.value, { gfm: true, breaks: true });
                preview.innerHTML = window.DOMPurify.sanitize(html);
            } else {
                preview.textContent = 'Aperçu HTML indisponible (bibliothèque manquante).\n\n' + field.value;
            }
        }

        function togglePreview() {
            preview.hidden = !preview.hidden;
            const expanded = !preview.hidden;
            previewButton.setAttribute('aria-expanded', String(expanded));
            previewButton.title = expanded ? 'Masquer la prévisualisation' : 'Afficher la prévisualisation Markdown';
            previewButton.setAttribute('aria-label', previewButton.title);
            previewButton.querySelector(`.${NS}-symbol`).innerHTML = icons[expanded ? 'eyeoff' : 'eye'];
            previewButton.lastElementChild.textContent = expanded ? 'Masquer aperçu' : 'Aperçu';
            if (expanded) refreshPreview();
        }

        previewButton.addEventListener('click', togglePreview);
        field.addEventListener('input', refreshPreview);
        field.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !emojiPanel.hidden) {
                closeEmojiPicker();
                return;
            }
            if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
            const shortcut = { b: 'bold', i: 'italic', k: 'link' }[event.key.toLowerCase()];
            if (!shortcut) return;
            event.preventDefault();
            apply(field, shortcut);
        });

        field.insertAdjacentElement('beforebegin', bar);
        field.insertAdjacentElement('afterend', preview);
    }

    function initialize() {
        for (const field of document.querySelectorAll('textarea')) attach(field);
    }

    const css = document.createElement('style');
    css.textContent = `
        .${NS} { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0 0 8px; padding:8px;
            background:#f6f8fb; color:#253449; border:1px solid #cdd7e3; border-radius:8px; font:13px/1.3 system-ui, sans-serif; }
        .${NS}-group { display:flex; flex-wrap:wrap; align-items:center; gap:3px; padding-right:7px; border-right:1px solid #ccd7e5; }
        .${NS}-group:last-of-type { border-right:0; }
        .${NS}-button { display:inline-flex; align-items:center; justify-content:center; gap:4px; min-height:30px; margin:0;
            padding:4px 7px; border:1px solid transparent; border-radius:5px; background:transparent; color:inherit;
            font:500 12px/1.2 system-ui, sans-serif; white-space:nowrap; cursor:pointer; }
        .${NS}-button:hover, .${NS}-button:focus-visible { background:#e2edff; border-color:#a9c8f0; }
        .${NS}-button:focus-visible { outline:2px solid #377dcc; outline-offset:1px; }
        .${NS}-symbol { display:inline-flex; align-items:center; justify-content:center; min-width:16px; font-size:11px; font-weight:800; }
        .${NS}-symbol svg { display:block; width:16px; height:16px; }
        .${NS}-compact .${NS}-button .${NS}-label:not(.${NS}-keep-label) { display:none; }
        .${NS}-compact .${NS}-button:not(.${NS}-labels-button) { min-width:32px; padding:5px 7px; }
        .${NS}-labels-button { margin-left:auto; border-color:#c6d5e8; }
        .${NS}-preview-button { background:#dfefff; border-color:#b2d3fa; color:#114a80; }
        .${NS}-emoji-panel { display:flex; flex:1 0 100%; flex-direction:column; gap:7px;
            box-sizing:border-box; padding:10px; background:#fff; border:1px solid #cdd7e3; border-radius:6px; }
        .${NS}-emoji-panel[hidden], .${NS}-emoji-section[hidden], .${NS}-emoji[hidden], .${NS}-emoji-empty[hidden] { display:none !important; }
        .${NS}-emoji-search { width:100%; max-width:360px; box-sizing:border-box; padding:7px 9px;
            border:1px solid #acbfd7; border-radius:5px; background:#fff; color:#253449;
            font:13px system-ui,sans-serif; }
        .${NS}-emoji-heading { margin:3px 0 5px; color:#56677e; font-weight:700; }
        .${NS}-emoji-grid { display:flex; flex-wrap:wrap; gap:4px; }
        .${NS}-emoji { width:37px; height:37px; padding:3px; background:transparent;
            border:1px solid transparent; border-radius:5px; font:23px/1 sans-serif; cursor:pointer; }
        .${NS}-emoji:hover, .${NS}-emoji:focus-visible { background:#e2edff; border-color:#a9c8f0; }
        .${NS}-emoji-empty { color:#69778b; }
        .${NS}-preview { display:block; margin:8px 0; padding:12px 15px; max-height:400px; overflow:auto;
            background:#fff; color:#202a36; border:1px solid #b5cbe4; border-radius:7px;
            overflow-wrap:anywhere; line-height:1.55; }
        .${NS}-preview[hidden] { display:none !important; }
        .${NS}-preview img { display:block; max-width:100%; height:auto; margin:8px auto; }
        .${NS}-preview pre { overflow:auto; padding:10px; background:#eef2f6; border-radius:5px; }
        .${NS}-preview code { font-family:ui-monospace, monospace; }
        .${NS}-preview table { width:100%; border-collapse:collapse; }
        .${NS}-preview td, .${NS}-preview th { padding:5px 8px; border:1px solid #d1d8e1; }
        .${NS}-preview blockquote { margin:8px 0; padding-left:10px; border-left:3px solid #9bb8d8; }
        @media (max-width:600px) { .${NS}-button { padding:4px 6px; } .${NS}-labels-button { margin-left:0; } }
        @media (prefers-color-scheme:dark) {
            .${NS} { background:#1f2937; color:#ebf0f7; border-color:#435165; }
            .${NS}-group { border-color:#435165; }
            .${NS}-button:hover, .${NS}-button:focus-visible { background:#344e70; border-color:#587aa0; }
            .${NS}-labels-button { border-color:#435165; }
            .${NS}-preview-button { background:#27486b; color:#eef6ff; border-color:#4d80b4; }
            .${NS}-emoji-panel { background:#1b2736; border-color:#435165; }
            .${NS}-emoji-search { background:#26374a; color:#f0f3f7; border-color:#52657b; }
            .${NS}-emoji-heading { color:#b7c6dc; }
            .${NS}-emoji:hover, .${NS}-emoji:focus-visible { background:#344e70; border-color:#587aa0; }
            .${NS}-emoji-empty { color:#b7c6dc; }
            .${NS}-preview { background:#192534; color:#eef2f9; border-color:#48617d; }
            .${NS}-preview pre { background:#2b3b50; }
            .${NS}-preview td, .${NS}-preview th { border-color:#53657a; }
        }
    `;
    document.head.appendChild(css);

    initialize();
    const observer = new MutationObserver(initialize);
    observer.observe(document.body, { childList: true, subtree: true });
})();
