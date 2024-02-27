import { assert, describe, expect, it, test } from 'vitest'
import { SpeedDb } from "../src/index";
import { type DemoNote } from './common';


describe('Collection test', () => {
  const sdb = new SpeedDb()
  const name = "notes"
  const indexes = ["folder", "is_active"] as const
  const uniques = ["id"] as const

  const notes = sdb.addCollection<DemoNote>(name, { uniques, indexes })

  it('has name: ' + name, () => {
    expect(notes.name).equals(name)
  })

  it('has objType: ' + name, () => {
    expect(notes.objType).equals(name)
  })

  test('has data property: ', () => {
    assert.isArray(notes.data)
  })

  test('has all unique indexes', () => {
    assert.containsAllKeys(notes.uniques, uniques)
  })

  test('has all indexes', () => {
    assert.containsAllKeys(notes.indexes, indexes)
  })

  const nData: DemoNote = {
    id: "Sdf",
    title: "sdfs",
    is_active: true
  }

  test('note insert to collection', () => {
    const n = notes.insert(nData)
    assert.containSubset(n, nData)
  })

  test('note get by id from collection', () => {
    const n = notes.by("id", nData.id)
    assert.equal(n?.id, nData.id)
  })

  test('note get by id from collection', () => {
    const n = notes.by("id", nData.id)
    let n1Sd = n?.$sd ?? -1
    const nGet = notes.get(n1Sd)
    let n2Sd = nGet?.$sd ?? -2
    assert.equal(n1Sd, n2Sd)
  })

  test('note insert throws on duplicate id', () => {
    assert.throw(() => notes.insert(nData))
  })

  test('note delete from collection', () => {
    const n = notes.by("id", nData.id)
    notes.delete(n?.$sd ?? -1)
    assert.isUndefined(notes.by("id", n?.id as string))
  })
})
