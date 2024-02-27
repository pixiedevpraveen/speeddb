import { assert, describe, expect, it, test } from 'vitest'
import { SpeedDb } from "../src/index";
import { type DemoNote } from './common';

describe('should', () => {
  it('exported', () => {
    expect(SpeedDb).toBeTypeOf("function")
  })
})

describe('SpeedDb test', () => {
  const sdb = new SpeedDb()
  const name = "notes"
  const indexes = ["folder", "is_active"] as const
  const uniques = ["id"] as const

  const notes = sdb.addCollection<DemoNote>(name, { uniques, indexes })
  test('addCollection giving note collection', () => {
    assert.equal(notes?.name, name)
  })

  const nData: DemoNote = {
    id: "Sdf",
    title: "sdfs",
    is_active: true
  }
  notes.insert(nData)

  test('getCollection giving note collection', () => {
    assert.equal(sdb.getCollection("notes")?.name, name)
  })

  test('getCollection giving note collection', () => {
    assert.equal(sdb.getCollection("notes")?.name, name)
  })
  test('SpeedDb toJson and fromJson', () => {
    const sdbJson = sdb.toJSON(true)
    const sdb2 = new SpeedDb()
    sdb2.fromJSON(sdbJson)

    const sdb2Json = sdb2.toJSON(true)
    assert.deepStrictEqual(sdbJson, sdb2Json)
  })
})
