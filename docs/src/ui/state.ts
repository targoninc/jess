import {signal} from "@targoninc/jess/dist/src";
import type {PageInfo} from "./pageInfo.ts";
import {Api} from "./lib/api.ts";

export const pages = signal<PageInfo[]>([]);
export const currentPage = signal<string>("");
export const currentPageContent = signal<string>("");

function getCurrentPage() {
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    if (searchParams.has("page")) {
        return searchParams.get("page") as string;
    }

    return "";
}

Api.getPages().then(newPages => {
    pages.value = newPages;
    currentPage.value = getCurrentPage();
});

currentPage.subscribe(page => {
    currentPageContent.value = "";
    Api.getPageContent(page).then(content => {
        currentPageContent.value = content;
    });
})