import type { CloneOption } from "./types"

export function isArray<E = any>(v: unknown | E[]): v is Array<E> {
    return Array.isArray(v)
}

type HasProperty<T> = {
    [K in keyof T]: T[K]
}

export function hasOwn<T>(o: T, k: PropertyKey): o is HasProperty<T> {
    return Object.hasOwnProperty.call(o, k)
}

export function clone<V>(value: V, option?: CloneOption): V {
    if (option && option.startsWith('shallow')) {
        const obj = Object.create(value as object)
        if (option.endsWith("Assign"))
            Object.assign(obj, value)
        else
            Object.entries(value as object).forEach(([k, v]) => {
                obj[k] = v
            })
        return obj
    }
    return structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}
