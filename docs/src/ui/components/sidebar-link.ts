import type {PageInfo} from "../pageInfo.ts";
import {type AnyElement, compute, create} from "@targoninc/jess/dist/src";
import {currentPage} from "../state.ts";

export function sidebarLink(page: PageInfo): AnyElement {
    const isActive = compute(p => p === page.title, currentPage);
    const active = compute((a): string => a ? "active" : "_", isActive);

    return create("div")
        .classes("sidebarLink", active)
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