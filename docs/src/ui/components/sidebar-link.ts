import type {PageInfo} from "../pageInfo.ts";
import {type AnyElement, create} from "@targoninc/jess/dist/src";

export function sidebarLink(page: PageInfo): AnyElement {
    return create("div")
        .classes("sidebarLink")
        .children(
            create("a")
                .classes("sidebar-link")
                .text(page.title)
                .href(`#${page.title.toLowerCase().replace(/ /g, "-")}`),
            create("div")
                .classes("sidebar-link-children")
                .children(
                    ...page.children.map(child => sidebarLink(child))
                ).build()
        ).build();
}