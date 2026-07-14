import { Mark, mergeAttributes, InputRule } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (title: string) => ReturnType
      unsetWikiLink: () => ReturnType
    }
  }
}

export const WikiLink = Mark.create({
  name: 'wikiLink',
  inclusive: false,
  excludes: '_',
  exitable: true,

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-wiki'),
        renderHTML: (attrs) => {
          if (!attrs.title) return {}
          return { 'data-wiki': attrs.title }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'wiki-link',
        'data-wiki': HTMLAttributes.title || HTMLAttributes['data-wiki'],
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setWikiLink:
        (title: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { title }),
      unsetWikiLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ range, match, chain }) => {
          const title = match[1].trim()
          if (!title) return
          chain()
            .deleteRange(range)
            .insertContent({
              type: 'text',
              text: title,
              marks: [{ type: this.name, attrs: { title } }],
            })
            .insertContent(' ')
            .run()
        },
      }),
    ]
  },
})
