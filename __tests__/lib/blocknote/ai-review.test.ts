import { Schema, type Node as PMNode } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'

import { collectAIChanges, resolveAIChange } from '@/lib/blocknote/ai-review'

// A tiny stand-in for the BlockNote schema: just enough structure (blocks with
// inline text) and the three suggestion marks xl-ai adds.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', marks: '_' },
    heading: {
      group: 'block',
      content: 'text*',
      marks: '_',
      attrs: { level: { default: 1 } }
    },
    text: {}
  },
  marks: {
    insertion: { attrs: { id: { default: null } } },
    deletion: { attrs: { id: { default: null } } },
    modification: {
      attrs: {
        id: { default: null },
        type: {},
        attrName: { default: null },
        previousValue: { default: null },
        newValue: { default: null }
      }
    }
  }
})

const ins = schema.marks.insertion.create()
const del = schema.marks.deletion.create()
const t = (text: string, marks = [] as ReturnType<typeof ins.type.create>[]) =>
  schema.text(text, marks)
const p = (...content: PMNode[]) => schema.nodes.paragraph.create(null, content)

function stateOf(...blocks: PMNode[]) {
  return EditorState.create({
    schema,
    doc: schema.nodes.doc.create(null, blocks)
  })
}

function texts(state: EditorState) {
  return state.doc.children.map((block) => block.textContent)
}

describe('collectAIChanges', () => {
  it('returns nothing for a document without suggestions', () => {
    expect(collectAIChanges(stateOf(p(t('clean'))).doc)).toEqual([])
  })

  it('splits distant edits in one paragraph into separate changes', () => {
    const state = stateOf(
      p(
        t('修改'),
        t('或者', [del]),
        t('或', [ins]),
        t('伪造请求, 这是一段足够长的未修改文本, 然后'),
        t('错字', [del]),
        t('错别字', [ins])
      )
    )
    const changes = collectAIChanges(state.doc)
    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({
      before: '或者',
      after: '或',
      contextBefore: '修改'
    })
    expect(changes[1]).toMatchObject({ before: '错字', after: '错别字' })
  })

  it('merges edits separated by a couple of unchanged characters', () => {
    const state = stateOf(
      p(t('a', [del]), t('b', [ins]), t('xy'), t('c', [del]), t('d', [ins]))
    )
    const changes = collectAIChanges(state.doc)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ before: 'axyc', after: 'bxyd' })
  })

  it('treats a restyled block as one change with a note', () => {
    const heading = schema.nodes.heading.create(
      { level: 2 },
      [t('Title')],
      [
        schema.marks.modification.create({
          type: 'nodeType',
          previousValue: 'paragraph',
          newValue: 'heading'
        })
      ]
    )
    const [change] = collectAIChanges(stateOf(heading).doc)
    expect(change).toMatchObject({
      before: 'Title',
      after: 'Title',
      note: 'paragraph → heading'
    })
  })
})

describe('resolveAIChange', () => {
  const twoEdits = () =>
    stateOf(
      p(
        t('one', [del]),
        t('1', [ins]),
        t(' unchanged middle '),
        t('two', [del]),
        t('2', [ins])
      )
    )

  it('accepts only the chosen change', () => {
    const state = twoEdits()
    const [first] = collectAIChanges(state.doc)
    const next = state.apply(resolveAIChange(state, first, true))

    expect(texts(next)).toEqual(['1 unchanged middle two2'])
    expect(collectAIChanges(next.doc)).toMatchObject([
      { before: 'two', after: '2' }
    ])
  })

  it('rejects only the chosen change', () => {
    const state = twoEdits()
    const [, second] = collectAIChanges(state.doc)
    const next = state.apply(resolveAIChange(state, second, false))

    expect(texts(next)).toEqual(['one1 unchanged middle two'])
    expect(collectAIChanges(next.doc)).toMatchObject([
      { before: 'one', after: '1' }
    ])
  })

  it('leaves no marks behind once every change is resolved', () => {
    let state = twoEdits()
    for (const accept of [true, false]) {
      const [change] = collectAIChanges(state.doc)
      state = state.apply(resolveAIChange(state, change, accept))
    }
    expect(texts(state)).toEqual(['1 unchanged middle two'])
    expect(collectAIChanges(state.doc)).toEqual([])
  })

  it('restores the previous type and attributes when rejecting a restyle', () => {
    const heading = schema.nodes.heading.create(
      { level: 3 },
      [t('Title')],
      [
        schema.marks.modification.create({
          type: 'attr',
          attrName: 'level',
          previousValue: 2,
          newValue: 3
        })
      ]
    )
    const state = stateOf(heading)
    const [change] = collectAIChanges(state.doc)

    const rejected = state.apply(resolveAIChange(state, change, false))
    expect(rejected.doc.firstChild!.attrs.level).toBe(2)
    expect(rejected.doc.firstChild!.marks).toEqual([])

    const accepted = state.apply(resolveAIChange(state, change, true))
    expect(accepted.doc.firstChild!.attrs.level).toBe(3)
    expect(accepted.doc.firstChild!.marks).toEqual([])
  })

  it('drops a whole inserted block when rejected', () => {
    const inserted = schema.nodes.paragraph.create(
      null,
      [t('new', [ins])],
      [ins]
    )
    const state = stateOf(p(t('keep')), inserted)
    const [change] = collectAIChanges(state.doc)
    const next = state.apply(resolveAIChange(state, change, false))
    expect(texts(next)).toEqual(['keep'])
  })
})
