import { BlogForm } from '@/components/blog-form'

export default function CreateBlogPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Blog</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the information and use the rich text editor to create a new
          blog
        </p>
      </div>

      <BlogForm mode="create" />
    </div>
  )
}
