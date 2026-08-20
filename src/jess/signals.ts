/**
 * Mapping used by {@link Signal#boolValues} to derive dependent boolean-based signals.
 * For each key, provide values to emit when the source signal is true or false.
 */
export interface BoolValueAssignments<T> {
    [key: string]: {
        onTrue: T,
        onFalse: T,
    }
}

/**
 * Callback invoked when a {@link Signal} updates.
 * @template T Type of the signal's value.
 * @param newValue The new value assigned to the signal.
 * @param changed Whether the new value is different from the previous one (strict inequality).
 */
export type SignalCallback<T> = (newValue: T, changed: boolean) => void;

/**
 * A subscription that is bound to a DOM node. When the node leaves the
 * document the subscription is dropped automatically (see
 * {@link sweepDetachedSubscriptions}), which releases the node subtree and
 * everything the callback closes over.
 * @internal
 */
interface NodeBoundSubscription {
    callback: SignalCallback<any>;
    key?: string;
    node: HTMLElement | SVGElement;
}

/**
 * Element-bound subscriptions grouped by signal. `Signal.set` prunes the
 * entries of the signal it is about to notify; the interval sweep prunes
 * every signal, catching subscriptions whose signals never fire again.
 * @internal
 */
const nodeBoundSubs = new Map<Signal<any>, NodeBoundSubscription[]>();

const SWEEP_INTERVAL_MS = 30_000;
let sweepInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Registers a subscription as bound to `node`. The subscription is removed
 * automatically once `node` is no longer connected to the document.
 * @internal
 */
export function trackNodeBoundSub<T>(
    signal: Signal<T>,
    callback: SignalCallback<T>,
    node: HTMLElement | SVGElement,
    key?: string,
): void {
    let subs = nodeBoundSubs.get(signal);
    if (!subs) {
        subs = [];
        nodeBoundSubs.set(signal, subs);
    }
    subs.push({ callback, node, key });
    ensureSweepInterval();
}

/**
 * Removes the registry entry for a subscription, if any. Called from the
 * public unsubscribe paths so explicitly unsubscribed subscriptions do not
 * linger in the registry.
 * @internal
 */
export function untrackNodeBoundSub<T>(signal: Signal<T>, callback: SignalCallback<T>, key?: string): void {
    const subs = nodeBoundSubs.get(signal);
    if (!subs) {
        return;
    }
    if (key !== undefined && key !== null) {
        const index = subs.findIndex(s => s.key === key);
        if (index !== -1) {
            subs.splice(index, 1);
        }
    } else {
        const index = subs.findIndex(s => s.callback === callback && (s.key === undefined || s.key === null));
        if (index !== -1) {
            subs.splice(index, 1);
        }
    }
    if (subs.length === 0) {
        nodeBoundSubs.delete(signal);
    }
}

/**
 * Drops every registered subscription whose node is no longer connected to
 * the document. Called by the sweep interval and exported for callers that
 * want immediate cleanup (e.g. before wiping a page container).
 */
export function sweepDetachedSubscriptions(): void {
    for (const signal of [...nodeBoundSubs.keys()]) {
        pruneNodeBoundSubs(signal);
    }
}

function ensureSweepInterval(): void {
    if (sweepInterval !== null) {
        return;
    }
    sweepInterval = setInterval(() => {
        sweepDetachedSubscriptions();
    }, SWEEP_INTERVAL_MS);
}

/**
 * Removes the node-bound subscriptions of `signal` whose node is detached.
 * @internal
 */
export function pruneNodeBoundSubs<T>(signal: Signal<T>): number {
    const subs = nodeBoundSubs.get(signal);
    if (!subs) {
        return 0;
    }
    const dead: NodeBoundSubscription[] = [];
    for (const sub of subs) {
        if (!sub.node.isConnected) {
            dead.push(sub);
        }
    }
    if (dead.length === 0) {
        return 0;
    }
    for (const sub of dead) {
        if (sub.key !== undefined && sub.key !== null) {
            signal._keyCallbacks.delete(sub.key);
        } else {
            const index = signal._callbacks.indexOf(sub.callback);
            if (index !== -1) {
                signal._callbacks.splice(index, 1);
            }
        }
    }
    const deadSet = new Set(dead);
    const alive = subs.filter(sub => !deadSet.has(sub));
    if (alive.length > 0) {
        nodeBoundSubs.set(signal, alive);
    } else {
        nodeBoundSubs.delete(signal);
    }
    maybePruneChain(signal);
    return dead.length;
}

/**
 * When a signal loses its last subscriber, its producers (the `compute`,
 * `when` or `boolValues` chain that feeds it) are no longer observed either
 * and are pruned so their closures cannot keep dead DOM alive.
 * @internal
 */
function maybePruneChain<T>(signal: Signal<T>): void {
    if (signal._callbacks.length === 0 && signal._keyCallbacks.size === 0) {
        signal._prune?.();
    }
}

/**
 * A minimal reactive value container with subscribe/unsubscribe, inspired by signals.
 * Subscribers are notified whenever the value is set; they also receive a flag indicating if it changed.
 */
export class Signal<T> {
    _callbacks: SignalCallback<T>[] = [];
    _keyCallbacks: Map<string, SignalCallback<T>> = new Map();
    _value: T;
    _values: { [key: string]: Signal<T> } = {};
    /**
     * Optional hook invoked when this signal loses its last subscriber.
     * Used by `compute`/`when`/`boolValues` to detach their producer
     * subscriptions so dead DOM cannot keep the chain alive.
     * @internal
     */
    _prune?: () => void;
    /**
     * Optional hook invoked when this signal gains its first subscriber.
     * Used by {@link lazyCompute} to defer subscribing to producer signals
     * until something actually consumes the value.
     * @internal
     */
    _onFirstSubscriber?: () => void;
    public readonly type = "jess-signal";

    /**
     * Create a new signal.
     * @param initialValue Initial value for the signal.
     */
    constructor(initialValue: T) {
        this._value = initialValue;
        this._values = {};
    }

    /**
     * Creates an object with signals whose values depend on this signal interpreted as boolean.
     * Example: `{ someKey: { onTrue: value1, onFalse: value2 } }`.
     * @param assignments Keyed configuration describing values for true/false cases.
     */
    boolValues(assignments: BoolValueAssignments<T> = {}): { [p: string]: Signal<T> } {
        for (let key in assignments) {
            if (assignments[key]) {
                this._values[key] = signal<T>(this._value ? assignments[key].onTrue : assignments[key].onFalse);
            }
        }
        const onValue = (newValue: T) => {
            for (let key in assignments) {
                if (assignments[key] && this._values[key]) {
                    this._values[key].value = newValue ? assignments[key].onTrue : assignments[key].onFalse;
                }
            }
        };
        this.subscribe(onValue);
        for (const key of Object.keys(this._values)) {
            const derived = this._values[key]!;
            derived._prune = () => {
                const allDead = Object.values(this._values).every(s => s._callbacks.length === 0 && s._keyCallbacks.size === 0);
                if (allDead) {
                    for (const k of Object.keys(this._values)) {
                        this._values[k]!._prune = undefined;
                    }
                    this.unsubscribe(onValue);
                }
            };
        }
        return this._values;
    }

    /**
     * Remove all non-keyed subscribers from this signal.
     */
    unsubscribeAll() {
        this._callbacks = [];
        maybePruneChain(this);
    }

    /**
     * Subscribe to updates.
     * @param callback Function invoked with the new value and a changed flag.
     * @param key Optional unique key. If provided, it replaces any previous callback stored under the same key.
     */
    subscribe(callback: SignalCallback<T>, key?: string|null) {
        const wasEmpty = this._callbacks.length === 0 && this._keyCallbacks.size === 0;
        if (key !== undefined && key !== null) {
            this._keyCallbacks.set(key, callback);
        } else {
            this._callbacks.push(callback);
        }
        if (wasEmpty && this._onFirstSubscriber) {
            this._onFirstSubscriber();
        }
    }

    /**
     * Unsubscribe a previously registered callback (keyed or unkeyed).
     * @param callback The same function reference passed to {@link subscribe}.
     */
    unsubscribe(callback: SignalCallback<T>) {
        untrackNodeBoundSub(this, callback);
        const index = this._callbacks.indexOf(callback);
        if (index >= 0) {
            this._callbacks.splice(index, 1);
        }

        for (const [key, func] of Object.entries(this._keyCallbacks)) {
            if (func === callback) {
                this.unsubscribeKey(key);
            }
        }
        maybePruneChain(this);
    }

    /**
     * Unsubscribe a callback registered with a specific key.
     * @param key The subscription key used when subscribing.
     */
    unsubscribeKey(key: string) {
        const callback = this._keyCallbacks.get(key);
        if (callback !== undefined) {
            untrackNodeBoundSub(this, callback, key);
        }
        this._keyCallbacks.delete(key);
        maybePruneChain(this);
    }

    /**
     * Current value of the signal.
     */
    get value(): T {
        return this._value;
    }

    /**
     * Assign a new value to the signal and notify subscribers.
     */
    set value(value: T) {
        // Drop subscriptions whose bound node left the document before
        // notifying, so detached DOM is released eagerly on the next signal
        // activity instead of waiting for the sweep interval.
        pruneNodeBoundSubs(this);
        const changed = this._value !== value;
        this._value = value;
        this._callbacks.forEach(callback => callback(value, changed));

        for (const [_, callback] of this._keyCallbacks.entries()) {
            callback(value, changed);
        }
    }

    /**
     * String representation of the underlying value.
     */
    toString(): string {
        // @ts-ignore
        return this._value.toString();
    }
}

/**
 * Convenience helper to create a {@link Signal}.
 * @param initialValue Initial value for the signal.
 */
export function signal<T>(initialValue: T): Signal<T> {
    return new Signal<T>(initialValue);
}

/**
 * Compute a derived signal from other signals synchronously.
 * The output updates whenever any input signal changes to a different value.
 */
export function compute<T, Args extends any[]>(
    valueFunction: (...args: Args) => T,
    ...signals: { [K in keyof Args]: Signal<Args[K]> }
): Signal<T> {
    const getValues = () => signals.map(s => s.value) as Args;
    let out = signal<T>(valueFunction(...getValues()));

    const unsubscribers = signals.map(sig => {
        const callback = (_: any, changed: boolean) => {
            if (!changed) {
                return;
            }
            out.value = valueFunction(...getValues());
        };
        sig.subscribe(callback);
        return () => sig.unsubscribe(callback);
    });
    // Once the output has no subscribers left, the compute chain is
    // unobservable: detach it from its inputs so dead DOM cannot keep it alive.
    out._prune = () => {
        out._prune = undefined;
        for (const unsubscribe of unsubscribers) {
            unsubscribe();
        }
    };
    return out;
}

/**
 * Compute a derived signal from other signals synchronously, subscribing to
 * the inputs only once the output gains its first subscriber.
 *
 * This is for derived values that are *usually* consumed reactively by a DOM
 * binding but are sometimes only read once (e.g. `notify(t("KEY"))`). With
 * eager {@link compute} every such call registers a permanent subscription on
 * the input signals, pinning the compute closure (and anything it captures)
 * forever. `lazyCompute` keeps the output's initial value available for plain
 * reads but subscribes to inputs on demand and detaches again via the prune
 * hook once the last consumer disappears.
 */
export function lazyCompute<T, Args extends any[]>(
    valueFunction: (...args: Args) => T,
    ...signals: { [K in keyof Args]: Signal<Args[K]> }
): Signal<T> {
    const getValues = () => signals.map(s => s.value) as Args;
    const out = new Signal<T>(valueFunction(...getValues()));
    let activated = false;
    let unsubscribers: Array<() => void> = [];

    out._onFirstSubscriber = () => {
        if (activated) {
            return;
        }
        activated = true;
        out._value = valueFunction(...getValues());
        unsubscribers = signals.map(sig => {
            const callback = (_: any, changed: boolean) => {
                if (!changed) {
                    return;
                }
                out._value = valueFunction(...getValues());
            };
            sig.subscribe(callback);
            return () => sig.unsubscribe(callback);
        });
    };
    out._prune = () => {
        out._prune = undefined;
        out._onFirstSubscriber = undefined;
        for (const unsubscribe of unsubscribers) {
            unsubscribe();
        }
        unsubscribers = [];
        activated = false;
    };
    return out;
}

/**
 * Compute a derived signal from other signals asynchronously.
 * The output updates whenever any input signal changes and awaits the async function.
 */
export async function computeAsync<T, Args extends any[]>(
    valueFunction: (...args: Args) => Promise<T>,
    ...signals: { [K in keyof Args]: Signal<Args[K]> }
): Promise<Signal<T>> {
    const getValues = () => signals.map(s => s.value) as Args;
    let out = signal<T>(await valueFunction(...getValues()));

    const unsubscribers = signals.map(sig => {
        const callback = async (_: any, changed: boolean) => {
            if (!changed) {
                return;
            }
            out.value = await valueFunction(...getValues());
        };
        sig.subscribe(callback);
        return () => sig.unsubscribe(callback);
    });
    out._prune = () => {
        out._prune = undefined;
        for (const unsubscribe of unsubscribers) {
            unsubscribe();
        }
    };
    return out;
}

/**
 * Runtime check whether an object appears to be a {@link Signal} created by this module.
 */
export function isSignal(obj: any): boolean {
    return obj?.type === "jess-signal";
}

/**
 * Ensure a value is wrapped as a {@link Signal}. If it's already a signal, return it; otherwise wrap it.
 */
export function asSignal<T>(obj: T|Signal<T>): Signal<Signal<T> | T> | Signal<T> {
    if (!isSignal(obj)) {
        return signal(obj);
    }
    return obj as Signal<T>;
}
