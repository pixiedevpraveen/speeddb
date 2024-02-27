import { describe, expect, it } from 'vitest'
import { EventEmitter } from '../src/EventEmitter';
import { type DemoNote } from './common';

describe('EventEmitter class', () => {
  const c = getEventEmitterObj()
  const onInsert = (ev: "insert", { doc }: { doc: DemoNote }) => {
    console.log("fired event", ev);
    console.log(doc);
  }

  const onUpdate = (ev: "update", { doc }: { doc: DemoNote, oldDoc: DemoNote }) => {
    console.log("fired event", ev);
    console.log(doc);
  }

  const onInsertUpdate = (ev: "insert" | "update", { }: any) => {
    console.log("onInsertUpdate fired event", ev);
  }


  it("Insert test: events contains the onInsert event", () => {
    c.on("insert", onInsert)
    expect(c.events.insert).contains(onInsert)
    c.off("insert", onInsert)
  })

  it("Insert test: events removed the onInsert event", () => {
    expect(c.events.insert).length(0)
  })

  it("Insert test: events removed the onInsert event", () => {
    expect(c.events.insert).length(0)
  })

  it("[insert, update] test: contains in both", () => {
    c.on(["insert", "update"], onInsertUpdate)
    expect(c.events.insert.length + c.events.update.length).toBe(2)
    c.off(["insert", "update"], onInsertUpdate)
  })

  it("Update test: events contains the onUpdate event", () => {
    c.on("update", onUpdate)
    expect(c.events.update).contains(onUpdate)
    c.off("update", onUpdate)
  })
})

function getEventEmitterObj() {
  const evs = ["insert", "update"] as const
  type EvHandlers<C> = {
    insert: { doc: C }
    update: { doc: C, oldDoc: C },
  }

  class Col extends EventEmitter<typeof evs[number], EvHandlers<DemoNote>> {
    constructor() {
      super(evs)
    }
    insert(doc: DemoNote) {
      this.emit("insert", { doc })
    }
  }
  return new Col()
}
