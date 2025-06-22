export interface BoolValueAssignments<T> {
    [key: string]: {
        onTrue: T,
        onFalse: T,
    }
}

export type SignalCallback<T> = (newValue: T, changed: boolean) => void;

export class Signal<T> {
    _callbacks: SignalCallback<T>[] = [];
    _keyCallbacks: Map<string, SignalCallback<T>> = new Map();
    _value: T;
    _values: { [key: string]: Signal<T> } = {};
    public readonly type = "jess-signal";

    constructor(initialValue: T) {
        this._value = initialValue;
        this._values = {};
    }

    /**
     * Creates an object with boolean signals that update when {this} updates.
     * @param assignments {Object} e.g. { someKey: { onTrue: value1, onFalse: value2 } }
     */
    boolValues(assignments: BoolValueAssignments<T> = {}) {
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

    unsubscribeAll() {
        this._callbacks = [];
    }

    subscribe(callback: SignalCallback<T>, key?: string|null) {
        if (key !== undefined && key !== null) {
            this._keyCallbacks.set(key, callback);
        } else {
            this._callbacks.push(callback);
        }
    }

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

    unsubscribeKey(key: string) {
        this._keyCallbacks.delete(key);
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        const changed = this._value !== value;
        this._value = value;
        this._callbacks.forEach(callback => callback(value, changed));

        for (const [_, callback] of this._keyCallbacks.entries()) {
            callback(value, changed);
        }
    }
}

export function signal<T>(initialValue: T) {
    return new Signal<T>(initialValue);
}

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

export function isSignal(obj: any) {
    return obj?.type === "jess-signal";
}

export function asSignal<T>(obj: T|Signal<T>) {
    if (!isSignal(obj)) {
        return signal(obj);
    }
    return obj as Signal<T>;
}
