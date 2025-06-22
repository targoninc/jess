import {signal} from "@targoninc/jess/dist/src";
import type {PageInfo} from "./pageInfo.ts";
import {Api} from "./lib/api.ts";

export const pages = signal<PageInfo[]>([]);
export const currentPage = signal<string>("");
export const currentPageContent = signal<string>("");

Api.getPages().then(newPages => {
    pages.value = newPages;
});

currentPage.subscribe(page => {
    currentPageContent.value = "";
    Api.getPageContent(page).then(content => {
        currentPageContent.value = content;
    });
})