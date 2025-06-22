import {compute, create} from "@targoninc/jess";
import {docsSite} from "./docs-site.ts";
import {currentPageContent, pages} from "../state.ts";
import {sidebar} from "./sidebar.ts";

export function page() {
    return create("div")
        .classes("page")
        .children(
            compute(p => sidebar(p), pages),
            compute(c => docsSite(c), currentPageContent),
        ).build();
}