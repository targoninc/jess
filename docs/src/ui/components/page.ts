import {compute, create, signal} from "@targoninc/jess/dist/src";
import {docsSite} from "./docs-site.ts";
import {pages} from "../state.ts";
import {sidebar} from "./sidebar.ts";

export function page() {
    const content = signal("");

    return create("div")
        .classes("page")
        .children(
            compute(p => sidebar(p), pages),
            compute(c => docsSite(c), content),
        ).build();
}