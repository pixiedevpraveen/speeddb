export type Pretify<T> = {
    [K in keyof T]: T[K]
} & {}

export type SpeedDbConstructorOptions = {
    env: "BROWSER" | "NODEJS"
}

export type SpeedDbOptions = {
    autoload: boolean;
    autosave: boolean;
    autosaveInterval: number;
}

export type CloneOption = "JSON" | "shallow" | "shallowAssign"

export type DBEvType = "init" | "loaded" | "changes" | "flushChanges" | "save" | "close" | "warning"

export type DBEventHandlers = {
    init: { er?: Error },
    loaded: { er?: Error },
    save: { er?: Error },
    changes: { colName: string },
    flushChanges: { msg?: string },
    close: { msg?: string },
    warning: { msg?: string },
}

export type CollectionEventType = "insert" | "update" | "pre-insert" | "pre-update" | "delete" | "flushChanges" | "warning" | "close"

export type Index<V extends Record<any, any>, K extends keyof V> = Record<K, (Map<V[K], (Set<V>)>)>
export type UniqueIndex<V extends Record<string, any>, K extends keyof V> = Record<K | '$sd', (Map<V[K] | number, V & SdMeta>)>
export type CollectionValidator<C> = ((value: C, operation: "I" | "U" | "D") => boolean)
export type CollectionCloneMethod<C> = (<T extends C | (C & SdMeta) | Partial<C & SdMeta> | undefined>(doc: T) => T) | CloneOption

export type CollectionOptions<C extends Record<any, any>> = { uniques: (keyof C)[], indexes: (keyof C)[], changeApi: boolean, validator: CollectionValidator<C>, cloneObjects: boolean, cloneMethod: CollectionCloneMethod<C> }
export type CollectionInitOptions<C extends Record<any, any>> = Partial<CollectionOptions<C>>

export type CollectionEvents<C> = {
    "pre-insert": { doc: C },
    insert: { doc: C },
    "pre-update": { doc: C, oldDoc: C },
    update: { doc: C, oldDoc: C },
    delete: { doc: C },
    warning: { msg?: string },
    close: { msg?: string },
    flushChanges: { msg?: string },
}

export type SdMeta = {
    '$sd': number
}

export type CollectionOperations = "I" | "U" | "D"

export type Change<C = Record<any, any>> = {
    name: string
} & (
    {
        operation: "I" | "D"
        obj: C & SdMeta
    }
    | {
        operation: "U"
        obj: (C & SdMeta) | Partial<C & SdMeta>
    }
)

export type CollectionJson<C> = {
    name: string
    objType: string
    key: "$sd"
    uniquesNames: ("$sd" | keyof C)[]
    indexesNames: (keyof C)[]
    cloneMethod: (<T extends C | (C & SdMeta) | undefined>(doc: T) => T) | CloneOption | undefined
    data: (C & SdMeta)[]
    changes: Change<C>[]
}
