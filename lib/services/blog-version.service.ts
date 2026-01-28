import { db } from '@/lib/db'
import { blogVersions, blogs, type BlogVersion } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export class BlogVersionService {
  /**
   * 创建版本快照
   */
  static async createVersion(
    blogId: string,
    userId: string,
    changeNote?: string
  ): Promise<BlogVersion> {
    // 获取当前博客内容
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, blogId))
      .limit(1)

    if (!blog) {
      throw new Error('博客不存在')
    }

    // 获取最新版本号
    const [latestVersion] = await db
      .select()
      .from(blogVersions)
      .where(eq(blogVersions.blogId, blogId))
      .orderBy(desc(blogVersions.version))
      .limit(1)

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1

    // 创建新版本
    const [newVersion] = await db
      .insert(blogVersions)
      .values({
        blogId,
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
   * 获取博客的所有版本历史
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
   * 获取特定版本
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
   * 恢复到指定版本
   */
  static async restoreVersion(
    blogId: string,
    versionId: string,
    userId: string
  ): Promise<void> {
    // 获取版本内容
    const version = await this.getVersion(versionId)
    if (!version) {
      throw new Error('版本不存在')
    }

    if (version.blogId !== blogId) {
      throw new Error('版本不属于该博客')
    }

    // 先创建当前状态的版本快照
    await this.createVersion(blogId, userId, '恢复前自动保存')

    // 更新博客内容为该版本的内容
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

    // 创建恢复操作的版本记录
    await this.createVersion(blogId, userId, `恢复到版本 ${version.version}`)
  }

  /**
   * 比较两个版本的差异
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
