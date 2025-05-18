// ==UserScript==
// @name         Markdown Toolbar
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Menu Markdown avec Preview
// @author       Aerya
// @match        https://planete-warez.net/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// ==/UserScript==

(function() {
    'use strict';

    // --- SVG ICONS ---
    const icons = {
        bold: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#333" d="M7 4h6a5 5 0 0 1 0 10H7zm0 0v16h7a5 5 0 0 0 0-10H7z"/></svg>`,
        italic: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><text x="7" y="19" font-size="20" font-family="serif" fill="#333" font-style="italic">I</text></svg>`,
        link: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#333" stroke-width="2" d="M10 13l-1.293 1.293a3 3 0 1 0 4.243 4.243l3.464-3.464a3 3 0 0 0-4.243-4.243L12 10"/><path stroke="#333" stroke-width="2" d="M14 11l1.293-1.293a3 3 0 0 0-4.243-4.243l-3.464 3.464a3 3 0 0 0 4.243 4.243L12 14"/></svg>`,
        image: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#fff" stroke="#333" stroke-width="2"/><circle cx="8" cy="10" r="2" fill="#333"/><path stroke="#333" stroke-width="2" d="M21 19l-6-6-4 4-4-4-4 4"/></svg>`,
        code: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2" fill="#fff" stroke="#333" stroke-width="2"/><path stroke="#333" stroke-width="2" d="M9 10l-2 2 2 2m6-4l2 2-2 2"/></svg>`,
        quote: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M7 17a5 5 0 0 1 5-5V6a9 9 0 0 0-9 9v2h4zm10 0a5 5 0 0 1 5-5V6a9 9 0 0 0-9 9v2h4z" fill="#333"/></svg>`,
        list: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="6" cy="7" r="2" fill="#333"/><circle cx="6" cy="17" r="2" fill="#333"/><circle cx="6" cy="12" r="2" fill="#333"/><rect x="11" y="6" width="9" height="2" fill="#333"/><rect x="11" y="11" width="9" height="2" fill="#333"/><rect x="11" y="16" width="9" height="2" fill="#333"/></svg>`,
        center: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="2" fill="#333"/><rect x="7" y="11" width="10" height="2" fill="#333"/><rect x="9" y="16" width="6" height="2" fill="#333"/></svg>`,
        preview: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="10" ry="6" stroke="#337ecc" stroke-width="2" fill="#e5f3fd"/><circle cx="12" cy="12" r="3" fill="#337ecc"/></svg>`,
        hide: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#c03" stroke-width="2" d="M2 2l20 20"/><ellipse cx="12" cy="12" rx="10" ry="6" stroke="#bbb" stroke-width="2" fill="#f7dede"/></svg>`
    };

    const buttons = [
        { label: "Gras",      md: "**",   icon: icons.bold },
        { label: "Italique",  md: "_",    icon: icons.italic },
        { label: "Lien",      md: "[texte](url)", icon: icons.link },
        { label: "Image",     md: "![alt](url)",  icon: icons.image },
        { label: "Code",      md: "`",    icon: icons.code },
        { label: "Citation",  md: "> ",   icon: icons.quote },
        { label: "Liste",     md: "- ",   icon: icons.list },
        { label: "Centre",    md: "<div align='center'></div>", icon: icons.center }
    ];

    function addMarkdownBar(field) {
        if (field.previousSibling && field.previousSibling.className === "md-toolbar") return;

        const bar = document.createElement('div');
        bar.className = "md-toolbar";
        bar.style.display = "flex";
        bar.style.gap = "6px";
        bar.style.marginBottom = "6px";
        bar.style.background = "#fafbfc";
        bar.style.padding = "6px";
        bar.style.borderRadius = "6px";
        bar.style.border = "1px solid #dde3ea";
        bar.style.fontSize = "1em";
        bar.style.alignItems = "center";
        bar.style.boxShadow = "0 1px 3px rgba(50,70,120,0.05)";

        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.innerHTML = btn.icon;
            b.title = btn.label;
            b.style.padding = "2px 6px";
            b.style.margin = "0";
            b.style.border = "none";
            b.style.background = "transparent";
            b.style.cursor = "pointer";
            b.style.transition = "background 0.15s";
            b.style.borderRadius = "4px";
            b.onmouseenter = () => b.style.background = "#e3eefa";
            b.onmouseleave = () => b.style.background = "transparent";
            b.onclick = function(e) {
                e.preventDefault();
                field.focus();
                insertMarkdown(field, btn.md, btn.label);
            };
            bar.appendChild(b);
        });

        const previewBtn = document.createElement('button');
        previewBtn.innerHTML = icons.preview + ' <span style="font-weight:500;font-size:0.97em;vertical-align:middle;">Preview</span>';
        previewBtn.title = "Afficher/Cacher le rendu Markdown";
        previewBtn.style.marginLeft = "12px";
        previewBtn.style.padding = "2px 12px";
        previewBtn.style.background = "#e5f3fd";
        previewBtn.style.border = "1px solid #b7dbf7";
        previewBtn.style.borderRadius = "5px";
        previewBtn.style.cursor = "pointer";
        previewBtn.style.fontWeight = "bold";
        previewBtn.style.display = "flex";
        previewBtn.style.alignItems = "center";
        previewBtn.onmouseenter = () => previewBtn.style.background = "#d4ecfa";
        previewBtn.onmouseleave = () => previewBtn.style.background = "#e5f3fd";

        const previewDiv = document.createElement('div');
        previewDiv.style.display = "none";
        previewDiv.style.marginTop = "9px";
        previewDiv.style.padding = "12px";
        previewDiv.style.background = "#f8faff";
        previewDiv.style.border = "1px solid #cde2f7";
        previewDiv.style.borderRadius = "7px";
        previewDiv.style.fontSize = "1em";
        previewDiv.style.maxHeight = "320px";
        previewDiv.style.overflowY = "auto";
        previewDiv.style.boxShadow = "0 1px 5px rgba(30,80,220,0.07)";

        let showing = false;

        previewBtn.onclick = function(e) {
            e.preventDefault();
            showing = !showing;
            if (showing) {
                renderPreview();
                previewDiv.style.display = "block";
                previewBtn.innerHTML = icons.hide + ' <span style="color:#c03;font-size:0.97em;vertical-align:middle;">Cacher</span>';
            } else {
                previewDiv.style.display = "none";
                previewBtn.innerHTML = icons.preview + ' <span style="font-weight:500;font-size:0.97em;vertical-align:middle;">Preview</span>';
            }
        };

        function renderPreview() {
            const mdText = field.value;
            previewDiv.innerHTML = window.marked.parse(mdText);
        }
        field.addEventListener('input', function() {
            if (previewDiv.style.display === "block") renderPreview();
        });

        bar.appendChild(previewBtn);
        field.parentNode.insertBefore(bar, field);
        field.parentNode.insertBefore(previewDiv, field.nextSibling);
    }

    function insertMarkdown(field, md, label) {
        const [start, end] = [field.selectionStart, field.selectionEnd];
        let val = field.value;
        if (label === "Lien") {
            field.setRangeText('[texte](url)', start, end, 'end');
        } else if (label === "Image") {
            field.setRangeText('![alt](url)', start, end, 'end');
        } else if (label === "Centre") {
            field.setRangeText("<div align='center'>" + val.substring(start, end) + "</div>", start, end, 'end');
        } else if (label === "Citation" || label === "Liste") {
            let lines = val.substring(start, end).split('\n').map(line => md + line);
            field.setRangeText(lines.join('\n'), start, end, 'end');
        } else {
            field.setRangeText(md + val.substring(start, end) + md, start, end, 'end');
        }
        field.focus();
    }

    function init() {
        document.querySelectorAll('textarea:not([data-md-toolbar])').forEach(field => {
            field.setAttribute('data-md-toolbar', '1');
            addMarkdownBar(field);
        });
    }

    init();

    const observer = new MutationObserver(() => {
        init();
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
