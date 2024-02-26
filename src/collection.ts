import type { SpeedDb } from "./index"
import { remove } from "@antfu/utils"
import { EventEmitter } from "./EventEmitter"
import { SDBError } from "./error"
import type { Change, CollectionCloneMethod, CollectionEventType, CollectionEvents, CollectionInitOptions, CollectionJson, CollectionOperations, CollectionValidator, Index, Pretify, SdMeta, UniqueIndex } from "./types"
import { clone, hasOwn, isArray } from "./utils"


export class Collection<C extends Record<any, any> = Record<any, any>> extends EventEmitter<CollectionEventType, CollectionEvents<C>> {
    name: string
    objType: string
    db: SpeedDb
    key = '$sd' as const

    private _changes: Change<C>[] = []
    indexesNames: Array<keyof C>
    uniquesNames: Array<keyof (C & SdMeta)>

    indexes: Index<C, keyof C>
    uniques: Pretify<UniqueIndex<C, keyof C>>
    private _data: (C & SdMeta)[]
    private nextSd = 0
    validator?: CollectionValidator<C>
    cloneObjects: boolean
    cloneMethod?: CollectionCloneMethod<C>

    constructor(name: string, db: SpeedDb, opt?: CollectionInitOptions<C>) {
        super(["insert", "pre-insert", "update", "pre-update", "delete", "flushChanges", "warning", "close"])

        this.name = this.objType = name
        this.db = db
        this._data = []
        this.cloneObjects = opt?.cloneObjects !== false
        this.indexes = {} as typeof this.indexes
        this.uniques = {} as typeof this.uniques
        this.indexesNames = []
        this.uniques[this.key] = new Map()
        this.uniquesNames = [this.key]

        if (!opt) return

        this.validator = opt.validator
        this.cloneMethod = opt.cloneMethod || "JSON"

        if (opt.indexes)
            this.indexesNames.push(...opt.indexes)
        if (opt.uniques)
            this.uniquesNames.push(...opt.uniques)

        this.resetIndex()

    }

    insert(value: C | C[], blkInsert?: boolean) {
        if (isArray(value)) {
            value.forEach(d => this.insert(d, true))
            return
        }
        if (this.validator && !this.validator(value, "I")) throw new SDBError("Value", "Invalid value")

        const ikey = this.checkIntegrity(value)
        if (ikey)
            throw new SDBError("Value", `unique index "${String(ikey)}" is present with value "${value[ikey]}"`)


        const doc: C & SdMeta = clone(value) as unknown as C & SdMeta
        doc.$sd = this.nextSd++

        if (!blkInsert) this.emit("pre-insert", { doc })

        this._data.push(doc)
        this.insertIndex(doc)
        this.emit("insert", { doc })
        this.addChange(doc, "I")
        return doc
    }

    update(rec: C & SdMeta) {
        return this.updateOne(rec, rec[this.key])
    }

    clone<T extends C | (C & SdMeta) | Partial<C & SdMeta> | undefined>(v: T, force = false): T {
        return this.cloneObjects || force ? (typeof this.cloneMethod === 'function' ? this.cloneMethod(v) : clone(v, this.cloneMethod)) : v
    }

    private updateOne(rec: C & SdMeta, sd: SdMeta[typeof this.key], merge = false) {
        const old = this.get(sd)
        if (!old) throw new SDBError('Value', 'Insert not found')

        const doc = this.clone(rec)
        this.emit("pre-update", { doc, oldDoc: rec })
        doc[this.key] = sd
        if (merge) { }
        else {
            rec[this.key] = sd
            remove(this._data, old)
            this._data.push(doc)
        }

        this.updateIndex(doc, old)
        this.addChange(rec, "U")
        this.emit("update", { doc, oldDoc: old })
        return doc
    }

    get(sd: number) {
        return this.clone(this.uniques.$sd.get(sd))
    }

    by<N extends keyof (C & SdMeta)>(name: N, value: (C & SdMeta)[N]) {
        if (!hasOwn(this.uniques, name)) throw new SDBError('Property', 'Not an unique value')
        return this.clone(this.uniques[name].get(value as any))
    }

    delete(sd: (C & SdMeta)[typeof this.key]) {
        const doc = this.uniques[this.key].get(sd)
        if (!doc) return false

        remove(this._data, doc)
        this.deleteIndex(doc)
        this.addChange(doc, "D")
        this.emit("delete", { doc })
        this.emitChangeDb()
        return doc
    }
    private emitChangeDb() {
        this.db.emit("changes", { colName: this.name })
    }
    private addChange(obj: C & SdMeta, operation: CollectionOperations) {
        this.changes.push({ name: this.name, obj: this.clone(obj, true), operation })
    }

    private resetIndex() {
        let len = this.indexesNames.length
        for (let i = 0; i < len; i++) {
            this.indexes[this.indexesNames[i]] = new Map()
        }
        len = this.uniquesNames.length
        for (let i = 0; i < len; i++) {
            this.uniques[this.uniquesNames[i]] = new Map()
        }
    }

    private checkIntegrity(rec: C | (C & SdMeta)) {
        let key: keyof (C & SdMeta) | null = null

        this.uniquesNames.some(u => {
            const v = this.by(u, rec[u])
            if (v) key = u
            return v
        })

        return key
    }

    private insertIndex(rec: C & SdMeta) {
        this.uniquesNames.forEach(n => {
            if (rec[n] === undefined) return
            if (!this.uniques[n])
                this.uniques[n] = new Map()
            if (hasOwn(rec, n))
                this.uniques[n].set(rec[n], rec)
        })
        this.indexesNames.forEach(n => {
            if (rec[n] === undefined) return
            let mp = this.indexes[n]
            if (!mp) this.indexes[n] = mp = new Map()

            let st = mp.get(rec[n])
            if (!st) {
                st = new Set()
                mp.set(rec[n], st)
            }
            st.add(rec)
        })
    }

    private updateIndex(rec: C & SdMeta, oldRec: C & SdMeta) {
        this.uniquesNames.forEach(n => {
            if (!this.uniques[n])
                this.uniques[n] = new Map()

            if (hasOwn(oldRec, n))
                this.uniques[n].delete(oldRec[n])

            if (rec[n] !== undefined && hasOwn(rec, n))
                this.uniques[n].set(rec[n], rec)
        })

        this.indexesNames.forEach(n => {
            let mp = this.indexes[n]
            if (!mp) this.indexes[n] = mp = new Map()

            let st = mp.get(oldRec[n])

            if (!st) {
                if (rec[n] === undefined) return

                st = new Set()
                mp.set(rec[n], st)
            } else st.delete(oldRec)

            st.add(rec)
        })
    }

    private deleteIndex(rec: C & SdMeta) {
        this.uniquesNames.forEach(n => {
            if (this.uniques[n] && hasOwn(rec, n))
                this.uniques[n].delete(rec[n])
        })
        this.indexesNames.forEach(n => {
            let mp = this.indexes[n]
            if (!mp) return

            let st = mp.get(rec[n])
            if (st) st.delete(rec)
        })
    }

    // TODO: wip
    private checkIndex() {
        this.uniquesNames.forEach(n => {
            // if (this.uniques[n] && hasOwn(rec, n))
            //     this.uniques[n].delete(rec[n])
        })
        this.indexesNames.forEach(n => {
            let mp = this.indexes[n]
            if (!mp) return

            // let st = mp.get(rec[n])
            // if (st) st.delete(rec)
        })
    }

    /**
     * Returns the collection data (cloned if cloneObjects set to true)
    */
    get data() {
        return this._data.map(d => this.clone(d))
    }

    /**
     * Returns the collection changes (cloned)
    */
    get changes() {
        return this._changes.map(c => ({ name: this.name, operation: c.operation, obj: this.clone(c.obj, true) })) as typeof this._changes
    }

    flushChanges(silent = false) {
        this._changes = []
        if (!silent)
            this.emit("flushChanges", {})
    }

    fromJSON({ name, objType, key, uniquesNames, indexesNames, changes, data }: CollectionJson<C>, { validate, clone }: { validate?: boolean, clone?: boolean } = {}) {
        this.name = name
        this.objType = objType
        this.key = key
        this.uniquesNames = uniquesNames
        this.indexesNames = indexesNames
        this.resetIndex()
        this._changes = changes ?? []
        this._data = []
        const failed: typeof this._data = []
        data.forEach(d => {
            const k = this.checkIntegrity(d)
            if (k) console.log(k, d[k]);

            if ((validate && this.validator && !this.validator(d, "I")) || this.checkIntegrity(d)) {
                failed.push(d)
                return
            }
            this.insertIndex(d)
            this._data.push(clone ? this.clone(d, true) : d)
        })
        return this
    }

    toJSON(fast=true): CollectionJson<C> {
        return { name: this.name, objType: this.objType, key: this.key, uniquesNames: this.uniquesNames, indexesNames: this.indexesNames, cloneMethod: this.cloneMethod, data: fast ? this._data : this.data, changes: fast ? this._changes : this.changes }
    }
    close(silent = false) {
        this.flushChanges(silent)
        this.indexesNames = []
        this.uniquesNames = []
        this.resetIndex()
        this.clearAllEvents()
    }
}
