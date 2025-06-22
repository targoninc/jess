import type {PageInfo} from "../pageInfo.ts";
import {type AnyElement, compute, create} from "@targoninc/jess/dist/src";
import {currentPage} from "../state.ts";

function toLink(title: string) {
    return `#${title.toLowerCase().replace(/ /g, "-")}`;
}

export function sidebarLink(page: PageInfo): AnyElement {
    const isActive = compute(p => p === page.title, currentPage);
    const active = compute((a): string => a ? "active" : "_", isActive);

    return create("div")
        .children(
            create("a")
                .classes("sidebar-link", active)
                .text(page.title)
                .href(toLink(page.title)),
            create("div")
                .classes("sidebar-link-children")
                .children(
                    ...page.children.map(child => sidebarLink(child))
                ).build()
        ).build();
}