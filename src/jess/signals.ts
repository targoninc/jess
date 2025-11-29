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
 * A minimal reactive value container with subscribe/unsubscribe, inspired by signals.
 * Subscribers are notified whenever the value is set; they also receive a flag indicating if it changed.
 */
export class Signal<T> {
    _callbacks: SignalCallback<T>[] = [];
    _keyCallbacks: Map<string, SignalCallback<T>> = new Map();
    _value: T;
    _values: { [key: string]: Signal<T> } = {};
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
        this.subscribe((newValue: T) => {
            for (let key in assignments) {
                if (assignments[key] && this._values[key]) {
                    this._values[key].value = newValue ? assignments[key].onTrue : assignments[key].onFalse;
                }
            }
        });
        return this._values;
    }

    /**
     * Remove all non-keyed subscribers from this signal.
     */
    unsubscribeAll() {
        this._callbacks = [];
    }

    /**
     * Subscribe to updates.
     * @param callback Function invoked with the new value and a changed flag.
     * @param key Optional unique key. If provided, it replaces any previous callback stored under the same key.
     */
    subscribe(callback: SignalCallback<T>, key?: string|null) {
        if (key !== undefined && key !== null) {
            this._keyCallbacks.set(key, callback);
        } else {
            this._callbacks.push(callback);
        }
    }

    /**
     * Unsubscribe a previously registered callback (keyed or unkeyed).
     * @param callback The same function reference passed to {@link subscribe}.
     */
    unsubscribe(callback: SignalCallback<T>) {
        const index = this._callbacks.indexOf(callback);
        if (index >= 0) {
            this._callbacks.splice(index, 1);
        }

        for (const [key, func] of Object.entries(this._keyCallbacks)) {
            if (func === callback) {
                this.unsubscribeKey(key);
            }
        }
    }

    /**
     * Unsubscribe a callback registered with a specific key.
     * @param key The subscription key used when subscribing.
     */
    unsubscribeKey(key: string) {
        this._keyCallbacks.delete(key);
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

    for (const sig of signals) {
        sig.subscribe((_, changed) => {
            if (!changed) {
                return;
            }
            out.value = valueFunction(...getValues());
        });
    }
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

    for (const sig of signals) {
        sig.subscribe(async (_, changed) => {
            if (!changed) {
                return;
            }
            out.value = await valueFunction(...getValues());
        });
    }
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
