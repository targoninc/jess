import {signal, Signal} from "./signals.ts";
import type {InputType} from "./InputType.ts";

export type TypeOrSignal<T> = T | Signal<T>;
export type StringOrSignal = TypeOrSignal<string>;
export type HtmlPropertyValue = StringOrSignal | TypeOrSignal<number | boolean | null | undefined>;
export type EventHandler<T> = ((this: GlobalEventHandlers, ev: T) => any) | Function | undefined;
export type AnyElement = HTMLElement | SVGElement;
export type AnyNode = DomNode | AnyElement;
export type AnyElementFactory = () => AnyElement;

type propertyOmissions = Omit<CSSStyleDeclaration, "cssText" | "cssFloat">;
type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];
type stringProperties = StringKeys<propertyOmissions>;
export type SettableCss = {
    [K in stringProperties]: StringOrSignal
};
export type CssClass = Partial<SettableCss>;

export function create(tag: string) {
    return new DomNode(tag);
}

export function nullElement() {
    return create("div").styles("display", "none").build();
}

export function when(condition: any, element: AnyElement | AnyElementFactory, inverted = false) {
    function getElement(): AnyElement {
        if (element.constructor === Function) {
            return (<AnyElementFactory>element)();
        }
        return <AnyElement>element;
    }

    if (condition && condition.constructor === Signal) {
        const state = signal(condition.value ? (inverted ? nullElement() : getElement()) : (inverted ? getElement() : nullElement()));
        condition.subscribe((newValue: any) => {
            if (newValue) {
                state.value = inverted ? nullElement() : getElement();
            } else {
                state.value = inverted ? getElement() : nullElement();
            }
        });
        return state;
    } else {
        return condition ? (inverted ? nullElement() : getElement()) : (inverted ? getElement() : nullElement());
    }
}

export type SignalMapCallback<T> = (item: T, index: number) => AnyElement;

export function signalMap<T>(arrayState: Signal<T[]>, wrapper: DomNode, callback: SignalMapCallback<T>, renderSequentially = false): any {
    if (!arrayState.subscribe) {
        throw new Error("arrayState argument for signalMap is not a signal");
    }

    const update = (newValue: Iterable<T>) => {
        if (!newValue) {
            return;
        }
        const tmp: T[] = [...newValue].filter(t => !!t);
        const children = [];
        if (renderSequentially) {
            wrapper.overwriteChildren();
            for (let i = 0; i < tmp.length; i++) {
                wrapper.children(callback(tmp[i]!, i));
            }
        } else {
            for (let i = 0; i < tmp.length; i++) {
                children.push(callback(tmp[i]!, i));
            }
            // @ts-ignore
            wrapper.overwriteChildren(...children);
        }
    };
    arrayState.subscribe(update);
    update(arrayState.value);

    return wrapper.build();
}

export function stack(message: string, debugInfo = {}) {
    console.warn(message, { debugInfo }, (new Error()).stack);
}

export function isValidElement(element: any) {
    const validTypes = [HTMLElement, SVGElement];
    return validTypes.some(type => element instanceof type);
}

export function getValue<T>(maybeSignal: Signal<T>|T): T {
    if (maybeSignal instanceof Signal) {
        return (maybeSignal as Signal<T>).value;
    }
    return maybeSignal as T;
}

type AnyElementWithKeyIndex = AnyElement & {
    [key: string]: HtmlPropertyValue
};

export class DomNode {
    _node: AnyElementWithKeyIndex;
    svgTags = ['svg', 'g', 'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect', 'text', 'textPath', 'tspan'];

    constructor(tag: string) {
        if (this.svgTags.includes(tag)) {
            this._node = document.createElementNS("http://www.w3.org/2000/svg", tag) as AnyElementWithKeyIndex;
        } else {
            this._node = document.createElement(tag) as AnyElementWithKeyIndex;
        }
    }

    applyGenericConfig(config: any) {
        return this.classes("jess", ...(config.classes ?? []))
            .attributes(...(config.attributes ?? []))
            .styles(...(config.styles ?? []))
            .id(config.id)
            .css(config.css)
            .title(config.title)
            .role(config.role);
    }

    build(): AnyElement {
        if (!isValidElement(this._node)) {
            throw new Error('Invalid node type. Must be an HTMLElement or a subclass.');
        }
        return this._node;
    }

    wrapProperty(property: string, value: HtmlPropertyValue) {
        if (value && value.constructor === Signal) {
            const sig = value as Signal<string>;
            this._node[property] = sig.value;
            sig.subscribe((newValue: HtmlPropertyValue) => {
                this._node[property] = newValue;
            });
        } else {
            if (value !== undefined && value !== null) {
                this._node[property] = value;
            }
        }
    }

    class(className: string) {
        return this.classes(className);
    }

    classes(...classes: StringOrSignal[]) {
        for (let cls of classes) {
            if (cls && cls.constructor === Signal) {
                const sig = cls as Signal<string>;
                let previousValue = sig.value as string;
                this._node.classList.add(previousValue);
                sig.subscribe((newValue: string) => {
                    this._node.classList.remove(previousValue);
                    this._node.classList.add(newValue);
                    previousValue = newValue;
                });
            } else {
                this._node.classList.add(cls as string);
            }
        }
        return this;
    }

    attribute(key: string, value: HtmlPropertyValue) {
        return this.attributes(key, value);
    }

    attributes(...attributes: HtmlPropertyValue[]) {
        if (arguments.length % 2 === 0) {
            for (let i = 0; i < arguments.length; i += 2) {
                const key = arguments[i];
                const value = arguments[i + 1];
                if (value && value.constructor === Signal) {
                    this._node.setAttribute(key, value.value);
                    value.onUpdate = (newValue: string) => {
                        this._node.setAttribute(key, newValue);
                    };
                } else {
                    this._node.setAttribute(key, value);
                }
            }
        } else {
            throw new Error('Invalid number of arguments for attributes. Must be even. (key, value, key, value, ...)');
        }
        return this;
    }

    id(id: HtmlPropertyValue) {
        this.wrapProperty('id', id);
        return this;
    }

    text(text: HtmlPropertyValue) {
        this.wrapProperty('innerText', text);
        return this;
    }

    title(title: HtmlPropertyValue) {
        this.wrapProperty('title', title);
        return this;
    }

    html(html: HtmlPropertyValue) {
        this.wrapProperty('innerHTML', html);
        return this;
    }

    children(...children: (TypeOrSignal<DomNode>|TypeOrSignal<AnyElement>|TypeOrSignal<AnyNode>|null)[]) {
        for (let node of arguments) {
            if (isValidElement(node)) {
                this._node.appendChild(node);
            } else if (node instanceof DomNode) {
                this._node.appendChild(node.build());
            } else if (node && node.constructor === Signal) {
                node.subscribe((newValue: AnyNode) => {
                    if (isValidElement(newValue)) {
                        this._node.replaceChild(newValue as AnyElement, childNode);
                        childNode = newValue;
                    } else if (newValue.constructor === DomNode) {
                        this._node.replaceChild(newValue.build(), childNode);
                        childNode = newValue.build();
                    } else {
                        stack('Unexpected value for child. Must be an HTMLElement or a subclass.', newValue);
                    }
                });
                let childNode = node.value;
                if (!isValidElement(childNode)) {
                    // Create a placeholder div if the value is not an HTMLElement so we can swap it out later
                    childNode = nullElement();
                }
                this._node.appendChild(childNode);
            } else if (node && node.constructor === Array) {
                for (let childNode of node) {
                    this.children(childNode);
                }
            } else {
                if (node) {
                    stack('Invalid node type. Must be an HTMLElement or a subclass.', node);
                }
            }
        }
        return this;
    }

    overwriteChildren() {
        this._node.innerHTML = '';
        return this.children(...arguments);
    }

    child() {
        return this.children(...arguments);
    }

    role(role: HtmlPropertyValue) {
        this.wrapProperty('role', role);
        return this;
    }

    prefixedAttribute(prefix: string, key: string, value: HtmlPropertyValue) {
        return this.attributes(`${prefix}-${key}`, value);
    }

    aria(key: string, value: HtmlPropertyValue) {
        return this.prefixedAttribute('aria', key, value);
    }

    data(key: string, value: HtmlPropertyValue) {
        return this.prefixedAttribute('data', key, value);
    }

    onclick(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onclick = callback;
        return this;
    }

    onauxclick(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onauxclick = callback;
        return this;
    }

    ondblclick(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondblclick = callback;
        return this;
    }

    onchange(callback: EventHandler<Event>) {
        // @ts-ignore
        this._node.onchange = callback;
        return this;
    }

    oninput(callback: EventHandler<Event>) {
        // @ts-ignore
        this._node.oninput = callback;
        return this;
    }

    onkeydown(callback: EventHandler<KeyboardEvent>) {
        // @ts-ignore
        this._node.onkeydown = callback;
        return this;
    }

    onkeyup(callback: EventHandler<KeyboardEvent>) {
        // @ts-ignore
        this._node.onkeyup = callback;
        return this;
    }

    onmousedown(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmousedown = callback;
        return this;
    }

    onmouseup(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmouseup = callback;
        return this;
    }

    onmouseover(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmouseover = callback;
        return this;
    }

    onmouseout(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmouseout = callback;
        return this;
    }

    onmousemove(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmousemove = callback;
        return this;
    }

    onmouseenter(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmouseenter = callback;
        return this;
    }

    onmouseleave(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onmouseleave = callback;
        return this;
    }

    oncontextmenu(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.oncontextmenu = callback;
        return this;
    }

    onwheel(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.onwheel = callback;
        return this;
    }

    ondrag(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondrag = callback;
        return this;
    }

    ondragend(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondragend = callback;
        return this;
    }

    ondragenter(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondragenter = callback;
        return this;
    }

    ondragstart(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondragstart = callback;
        return this;
    }

    ondragleave(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondragleave = callback;
        return this;
    }

    ondragover(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondragover = callback;
        return this;
    }

    ondrop(callback: EventHandler<MouseEvent>) {
        // @ts-ignore
        this._node.ondrop = callback;
        return this;
    }

    onscroll(callback: EventListener) {
        this._node.onscroll = callback;
        return this;
    }

    onfocus(callback: EventListener) {
        this._node.onfocus = callback;
        return this;
    }

    onblur(callback: EventListener) {
        this._node.onblur = callback;
        return this;
    }

    onresize(callback: EventListener) {
        this._node.onresize = callback;
        return this;
    }

    onselect(callback: EventListener) {
        this._node.onselect = callback;
        return this;
    }

    onsubmit(callback: EventListener) {
        this._node.onsubmit = callback;
        return this;
    }

    onreset(callback: EventListener) {
        this._node.onreset = callback;
        return this;
    }

    onabort(callback: EventListener) {
        this._node.onabort = callback;
        return this;
    }

    onerror(callback: OnErrorEventHandler) {
        this._node.onerror = callback;
        return this;
    }

    oncanplay(callback: EventListener) {
        this._node.oncanplay = callback;
        return this;
    }

    oncanplaythrough(callback: EventListener) {
        this._node.oncanplaythrough = callback;
        return this;
    }

    ondurationchange(callback: EventListener) {
        this._node.ondurationchange = callback;
        return this;
    }

    onemptied(callback: EventListener) {
        this._node.onemptied = callback;
        return this;
    }

    onended(callback: EventListener) {
        this._node.onended = callback;
        return this;
    }

    onloadeddata(callback: EventListener) {
        this._node.onloadeddata = callback;
        return this;
    }

    onloadedmetadata(callback: EventListener) {
        this._node.onloadedmetadata = callback;
        return this;
    }

    onloadstart(callback: EventListener) {
        this._node.onloadstart = callback;
        return this;
    }

    onpause(callback: EventListener) {
        this._node.onpause = callback;
        return this;
    }

    onplay(callback: EventListener) {
        this._node.onplay = callback;
        return this;
    }

    onplaying(callback: EventListener) {
        this._node.onplaying = callback;
        return this;
    }

    onprogress(callback: EventListener) {
        this._node.onprogress = callback;
        return this;
    }

    onratechange(callback: EventListener) {
        this._node.onratechange = callback;
        return this;
    }

    onseeked(callback: EventListener) {
        this._node.onseeked = callback;
        return this;
    }

    onseeking(callback: EventListener) {
        this._node.onseeking = callback;
        return this;
    }

    onstalled(callback: EventListener) {
        this._node.onstalled = callback;
        return this;
    }

    onsuspend(callback: EventListener) {
        this._node.onsuspend = callback;
        return this;
    }

    ontimeupdate(callback: EventListener) {
        this._node.ontimeupdate = callback;
        return this;
    }

    onvolumechange(callback: EventListener) {
        this._node.onvolumechange = callback;
        return this;
    }

    onwaiting(callback: EventListener) {
        this._node.onwaiting = callback;
        return this;
    }

    oncopy(callback: EventListener) {
        this._node.oncopy = callback;
        return this;
    }

    oncut(callback: EventListener) {
        this._node.oncut = callback;
        return this;
    }

    onpaste(callback: EventListener) {
        this._node.onpaste = callback;
        return this;
    }

    onanimationstart(callback: EventListener) {
        this._node.onanimationstart = callback;
        return this;
    }

    onanimationend(callback: EventListener) {
        this._node.onanimationend = callback;
        return this;
    }

    onanimationiteration(callback: EventListener) {
        this._node.onanimationiteration = callback;
        return this;
    }

    ontransitionend(callback: EventListener) {
        this._node.ontransitionend = callback;
        return this;
    }

    on(eventName: string, callback: EventListenerOrEventListenerObject) {
        this._node.addEventListener(eventName, callback);
        return this;
    }

    open(open: HtmlPropertyValue) {
        this.wrapProperty('open', open);
        return this;
    }

    src(src: HtmlPropertyValue) {
        this.wrapProperty('src', src);
        return this;
    }

    alt(alt: HtmlPropertyValue) {
        this.wrapProperty('alt', alt);
        return this;
    }

    css(css: CssClass) {
        if (!css) {
            return this;
        }
        for (const [key, value] of Object.entries(css as Record<string, StringOrSignal>)) {
            this.styles(key, value);
        }
        return this;
    }

    style(key: string, value: StringOrSignal) {
        return this.styles(key, value);
    }

    styles(...styles: StringOrSignal[]) {
        if (arguments.length % 2 === 0) {
            for (let i = 0; i < arguments.length; i += 2) {
                const key = arguments[i];
                const value = arguments[i + 1];
                if (key.constructor !== String) {
                    throw new Error('Invalid key type for styles. Must be a string.');
                }
                if (value && value.constructor === Signal) {
                    // @ts-ignore
                    this._node.style[key] = value.value;
                    value.onUpdate = (newValue: any) => {
                        // @ts-ignore
                        this._node.style[key] = newValue;
                    };
                } else {
                    // @ts-ignore
                    this._node.style[key] = value;
                }
            }
        } else {
            throw new Error('Invalid number of arguments for styles. Must be even. (key, value, key, value, ...)');
        }
        return this;
    }

    width(width: HtmlPropertyValue) {
        this.wrapProperty('width', width);
        return this;
    }

    height(height: HtmlPropertyValue) {
        this.wrapProperty('height', height);
        return this;
    }

    type(type: TypeOrSignal<InputType>) {
        // @ts-ignore
        this.wrapProperty('type', type);
        return this;
    }

    name(name: HtmlPropertyValue) {
        this.wrapProperty('name', name);
        return this;
    }

    value(value: HtmlPropertyValue) {
        this.wrapProperty('value', value);
        return this;
    }

    placeholder(placeholder: HtmlPropertyValue) {
        this.wrapProperty('placeholder', placeholder);
        return this;
    }

    for(forId: HtmlPropertyValue) {
        this.wrapProperty('for', forId);
        return this;
    }

    checked(checked: HtmlPropertyValue) {
        this.wrapProperty('checked', checked);
        return this;
    }

    disabled(disabled: HtmlPropertyValue) {
        this.wrapProperty('disabled', disabled);
        return this;
    }

    selected(selected: HtmlPropertyValue) {
        this.wrapProperty('selected', selected);
        return this;
    }

    href(href: HtmlPropertyValue) {
        this.wrapProperty('href', href);
        return this;
    }

    target(target: HtmlPropertyValue) {
        this.wrapProperty('target', target);
        return this;
    }

    rel(rel: HtmlPropertyValue) {
        this.wrapProperty('rel', rel);
        return this;
    }

    required(required: HtmlPropertyValue) {
        this.wrapProperty('required', required);
        return this;
    }

    multiple(multiple: HtmlPropertyValue) {
        this.wrapProperty('multiple', multiple);
        return this;
    }

    accept(accept: HtmlPropertyValue) {
        this.wrapProperty('accept', accept);
        return this;
    }

    acceptCharset(acceptCharset: HtmlPropertyValue) {
        this.wrapProperty('acceptCharset', acceptCharset);
        return this;
    }

    action(action: HtmlPropertyValue) {
        this.wrapProperty('action', action);
        return this;
    }

    autocomplete(autocomplete: HtmlPropertyValue) {
        this.wrapProperty('autocomplete', autocomplete);
        return this;
    }

    enctype(enctype: HtmlPropertyValue) {
        this.wrapProperty('enctype', enctype);
        return this;
    }

    method(method: HtmlPropertyValue) {
        this.wrapProperty('method', method);
        return this;
    }

    novalidate(novalidate: HtmlPropertyValue) {
        this.wrapProperty('novalidate', novalidate);
        return this;
    }
}