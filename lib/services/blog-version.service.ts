import { db } from '@/lib/db'
import { blogVersions, blogs, type BlogVersion } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export class BlogVersionService {
  /**
   * Create a version snapshot
   */
  static async createVersion(
    blogId: string,
    userId: string,
    changeNote?: string
  ): Promise<BlogVersion> {
    // Get the current blog content
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, blogId))
      .limit(1)

    if (!blog) {
      throw new Error('Blog does not exist')
    }

    // Get the latest version number
    const [latestVersion] = await db
      .select()
      .from(blogVersions)
      .where(eq(blogVersions.blogId, blogId))
      .orderBy(desc(blogVersions.version))
      .limit(1)

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1

    // Create a new version
    const [newVersion] = await db
      .insert(blogVersions)
      .values({
        version: nextVersion,
        title: blog.title,
        content: blog.content,
        summary: blog.summary,
        coverImage: blog.coverImage,
        changedBy: userId,
        changeNote
      })
      .returning()

    return newVersion
  }

  /**
   * Get all version history of the blog
   */
  static async getVersions(blogId: string): Promise<BlogVersion[]> {
    const versions = await db
      .select()
      .from(blogVersions)
      .where(eq(blogVersions.blogId, blogId))
      .orderBy(desc(blogVersions.version))

    return versions
  }

  /**
   * Get a specific version
   */
  static async getVersion(versionId: string): Promise<BlogVersion | null> {
    const [version] = await db
      .select()
      .from(blogVersions)
      .where(eq(blogVersions.id, versionId))
      .limit(1)

    return version || null
  }

  /**
   * Restore to a specific version
   */
  static async restoreVersion(
    blogId: string,
    versionId: string,
    userId: string
  ): Promise<void> {
    // Get version content
    const version = await this.getVersion(versionId)
    if (!version) {
      throw new Error('Version does not exist')
    }

    if (version.blogId !== blogId) {
      throw new Error('Version does not belong to this blog')
    }

    // Create a version snapshot of the current state first
    await this.createVersion(blogId, userId, 'Auto-save before restore')

    // Update blog content to the version content
    await db
      .update(blogs)
      .set({
        title: version.title,
        content: version.content,
        summary: version.summary,
        coverImage: version.coverImage,
        updatedAt: new Date()
      })
      .where(eq(blogs.id, blogId))

    // Create a version record for the restore operation
    await this.createVersion(blogId, userId, `Restored to version ${version.version}`)
  }

  /**
   * Compare differences between two versions
   */
  static async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: BlogVersion
    version2: BlogVersion
    differences: {
      title: boolean
      content: boolean
      summary: boolean
      coverImage: boolean
    }
  }> {
    const version1 = await this.getVersion(versionId1)
    const version2 = await this.getVersion(versionId2)

    if (!version1 || !version2) {
      throw new Error('版本不存在')
    }

    return {
      version1,
      version2,
      differences: {
        title: version1.title !== version2.title,
        content: version1.content !== version2.content,
        summary: version1.summary !== version2.summary,
        coverImage: version1.coverImage !== version2.coverImage
      }
    }
  }
}
