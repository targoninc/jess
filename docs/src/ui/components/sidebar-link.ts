import type {PageInfo} from "../pageInfo.ts";
import {type AnyElement, compute, create} from "@targoninc/jess";
import {currentPage} from "../state.ts";

function toLink(page: PageInfo) {
    return `/?page=${encodeURIComponent(page.filename)}`;
}

export function sidebarLink(page: PageInfo): AnyElement {
    const isActive = compute(p => p === page.title, currentPage);
    const active = compute((a): string => a ? "active" : "_", isActive);

    return create("div")
        .classes("flex-v", "no-gap")
        .children(
            create("a")
                .classes("sidebar-link", active)
                .text(page.title)
                .href(toLink(page)),
            create("div")
                .classes("sidebar-link-children", "flex-v", "no-gap")
                .children(
                    ...page.children.map(child => sidebarLink(child))
                ).build()
        ).build();
}