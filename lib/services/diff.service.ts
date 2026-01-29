import { diffLines, diffWords } from 'diff'

export interface DiffResult {
  title: DiffChange[]
  summary: DiffChange[]
  content: DiffChange[]
  coverImage: {
    old: string | null
    new: string | null
    changed: boolean
  }
}

export interface DiffChange {
  value: string
  added?: boolean
  removed?: boolean
}

export interface BlogVersion {
  title: string
  summary: string | null
  content: string
  coverImage: string | null
}

export class DiffService {
  /**
   * Compare two blog versions and return diff results
   */
  static compareBlogVersions(
    oldVersion: BlogVersion,
    newVersion: BlogVersion
  ): DiffResult {
    return {
      title: this.compareWords(oldVersion.title, newVersion.title),
      summary: this.compareWords(
        oldVersion.summary || '',
        newVersion.summary || ''
      ),
      content: this.compareLines(oldVersion.content, newVersion.content),
      coverImage: {
        old: oldVersion.coverImage,
        new: newVersion.coverImage,
        changed: oldVersion.coverImage !== newVersion.coverImage
      }
    }
  }

  /**
   * Word-level diff for short text (title, summary)
   */
  private static compareWords(oldText: string, newText: string): DiffChange[] {
    return diffWords(oldText, newText).map((change) => ({
      value: change.value,
      added: change.added,
      removed: change.removed
    }))
  }

  /**
   * Line-level diff for long text (content)
   */
  private static compareLines(oldText: string, newText: string): DiffChange[] {
    return diffLines(oldText, newText).map((change) => ({
      value: change.value,
      added: change.added,
      removed: change.removed
    }))
  }

  /**
   * Get a simplified text summary of changes
   */
  static getChangeSummary(diff: DiffResult): string {
    const changes: string[] = []

    const hasChanges = (changes: DiffChange[]) =>
      changes.some((c) => c.added || c.removed)

    if (hasChanges(diff.title)) {
      changes.push('title')
    }
    if (hasChanges(diff.summary)) {
      changes.push('summary')
    }
    if (hasChanges(diff.content)) {
      changes.push('content')
    }
    if (diff.coverImage.changed) {
      changes.push('cover image')
    }

    if (changes.length === 0) {
      return 'No changes'
    }

    return `Changed: ${changes.join(', ')}`
  }

  /**
   * Count additions and removals
   */
  static countChanges(changes: DiffChange[]): {
    additions: number
    deletions: number
  } {
    return changes.reduce(
      (acc, change) => {
        if (change.added) {
          acc.additions += change.value.length
        } else if (change.removed) {
          acc.deletions += change.value.length
        }
        return acc
      },
      { additions: 0, deletions: 0 }
    )
  }
}
