import { ExternalLink, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import type { OpenSourceProject } from '@/lib/services/settings.service'

interface Props {
  projects: OpenSourceProject[]
}

export function HomeOpenSource({ projects }: Props) {
  if (!projects.length) return null

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex items-center gap-3">
          <Star className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold tracking-tight">
            Latest Open Sources
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.link}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border">
                  <Image
                    src={project.logo}
                    alt={project.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <span className="truncate font-semibold">{project.name}</span>
                  <ExternalLink className="text-muted-foreground group-hover:text-foreground ml-2 h-4 w-4 shrink-0 transition-colors" />
                </div>
              </div>

              {project.description && (
                <p className="text-muted-foreground line-clamp-3 text-sm">
                  {project.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
