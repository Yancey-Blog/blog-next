import { AlgoliaSearch } from './algolia-search'
import { FrontendHeaderClient } from './frontend-header-client'

export function FrontendHeader() {
  return (
    <FrontendHeaderClient>
      <AlgoliaSearch />
    </FrontendHeaderClient>
  )
}
