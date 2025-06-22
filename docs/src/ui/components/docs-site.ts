import {marked} from "marked";
import DOMPurify from 'dompurify';
import {create} from "@targoninc/jess/dist/src";

function parseMarkdown(text: string) {
    const rawMdParsed = marked.parse(text, {
        async: false
    });
    return DOMPurify.sanitize(rawMdParsed);
}

export function docsSite(content: string) {
    return create("div")
        .classes("docsSite")
        .html(parseMarkdown(content))
        .build();
}