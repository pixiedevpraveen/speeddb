import { EventEmitter } from "./EventEmitter"
import { Collection } from "./collection"
import { SDBError, invalidName } from "./error"
import type { CollectionInitOptions, CollectionJson, DBEvType, DBEventHandlers, SpeedDbConstructorOptions, SpeedDbOptions } from "./types"
import { isArray } from "./utils"

/**-----------------------------------------------------
 * ```
 *  .d8888b.                                  888 8888888b.  888888b.   
 * d88P  Y88b                                 888 888  "Y88b 888  "88b  
 * Y88b.                                      888 888    888 888  .88P  
 *  "Y888b.   88888b.   .d88b.   .d88b.   .d88888 888    888 8888888K.  
 *     "Y88b. 888 "88b d8P  Y8b d8P  Y8b d88" 888 888    888 888  "Y88b 
 *       "888 888  888 88888888 88888888 888  888 888    888 888    888 
 * Y88b  d88P 888 d88P Y8b.     Y8b.     Y88b 888 888  .d88P 888   d88P 
 *  "Y8888P"  88888P"   "Y8888   "Y8888   "Y88888 8888888P"  8888888P"  
 *            888                                                       
 *            888                                                       
 *            888                                                       
 * ```
 * A document oriented tiny and fast offline-first js database that supports (and|or) queries, sorting and indexing
 *
 * @author Praveen yadav
 *
 * ------------------------------------------------------*/
export class SpeedDb extends EventEmitter<DBEvType, DBEventHandlers> {
    constructor(name?: string, opt?: Partial<SpeedDbConstructorOptions>) {
        super(["init", "loaded", "changes", "save", "flushChanges", "close", "warning"])
        this.name = name || "speed.db"
        this.options.env = opt?.env || "BROWSER"
    }

    name: string
    private collections = {} as Record<string, Collection<any>>
    options: Partial<SpeedDbConstructorOptions> & SpeedDbOptions = {
        autoload: true,
        autosave: true,
        autosaveInterval: 1000,
        env: "BROWSER"
    }

    getCollection<C extends Record<any, any>>(name: string): Collection<C> | undefined {
        return this.collections[name]
    }

    addCollection<C extends Record<any, any>>(name: string, opt?: CollectionInitOptions<C>) {
        if (opt) {
            if (!isArray(opt.indexes) || !opt.indexes.every(function (i) { return typeof i === 'string' }) || !isArray(opt.uniques) || !opt.uniques.every(function (i) { return typeof i === 'string' })) throw new SDBError("Type", "Indexes needs to be an array of strings")
        }
        return this.collections[name] = new Collection(name, this, opt ?? {})
    }

    loadCollection<C extends Record<any, any>>(coll: Collection<C> | CollectionJson<C>) {
        if (!coll.name)
            invalidName()
        return this.collections[coll.name] = coll instanceof Collection ? coll : new Collection(coll.name, this).fromJSON(coll)
    }

    chain() { }

    clearChanges() {
        Object.values(this.collections).forEach(function (col) {
            col.flushChanges()
        })
        this.emit("flushChanges", {})
    }
    toJSON(fast=true): {
        name: string;
        options: Partial<SpeedDbConstructorOptions> & SpeedDbOptions
        collections: CollectionJson<any>[]
    } {
        return {
            name: this.name,
            options: this.options,
            collections: Object.values(this.collections).map(coll => coll.toJSON(fast))
        }
    }
    fromJSON({ name, options, collections }: {
        name: string;
        options: Partial<SpeedDbConstructorOptions> & SpeedDbOptions
        collections: CollectionJson<any>[]
    }) {
        this.name = name
        this.options = options
        this.collections = {}
        collections.forEach(coll => this.collections[coll.name] = new Collection(coll.name, this).fromJSON(coll))
        this.emit("loaded", {})
        return this
    }
    close(silent=false) {
        Object.values(this.collections).forEach(function (col) {
            col.close(silent)
        })
        this.collections = {}
        this.emit("close", {})
        this.clearAllEvents()
    }
}
