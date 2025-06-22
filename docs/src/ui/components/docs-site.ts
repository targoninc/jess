import {marked} from "marked";
import DOMPurify from 'dompurify';
import {create} from "@targoninc/jess";
import hljs from "highlight.js";

function parseMarkdown(text: string) {
    const rawMdParsed = marked.parse(text, {
        async: false
    });
    return DOMPurify.sanitize(rawMdParsed);
}

export function docsSite(content: string) {
    setTimeout(() => {
        hljs.highlightAll();
        document.querySelectorAll("article a:not([target='_blank'])").forEach(a => {
            (a as HTMLAnchorElement).target = "_blank";
        });
    })

    return create("article")
        .classes("content")
        .html(parseMarkdown(content))
        .build();
}