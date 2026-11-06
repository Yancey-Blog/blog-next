import {
  CloudKitRequestError,
  lookupRecord,
  modifyRecords,
  queryRecords,
  type CloudKitConfig,
  type CloudKitRecord
} from './cloudkit'

/** Metadata only: no decryption key, author-supplied title or asset URL is exposed. */
function item(record: CloudKitRecord) {
  return {
    id: record.recordName,
    revision: record.recordChangeTag ?? '',
    owner: record.created?.userRecordName ?? null,
    createdAt: record.created?.timestamp ?? null,
    updatedAt: record.modified?.timestamp ?? null,
    bytes:
      typeof record.fields?.bytes?.value === 'number'
        ? record.fields.bytes.value
        : null
  }
}

export async function listLinkShares(
  db: CloudKitConfig,
  marker?: string | null
) {
  const result = await queryRecords(db, 'PublishedPage', {
    filterBy: [
      {
        fieldName: 'listed',
        comparator: 'EQUALS',
        fieldValue: { value: 0, type: 'INT64' }
      }
    ],
    limit: 50,
    marker,
    desiredKeys: ['listed', 'bytes']
  })
  return {
    items: result.records
      .filter((record) => record.fields?.listed?.value === 0)
      .map(item),
    marker: result.marker
  }
}

/** Remove exactly the encrypted revision inspected in the protected CMS. */
export async function removeLinkShare(
  db: CloudKitConfig,
  id: string,
  revision: string
) {
  const record = await lookupRecord(db, 'PublishedPage', id)
  if (!record) throw new CloudKitRequestError(404)
  if (
    record.fields?.listed?.value !== 0 ||
    !revision ||
    revision !== record.recordChangeTag
  )
    throw new CloudKitRequestError(409)
  await modifyRecords(db, [
    {
      operationType: 'delete',
      record: { recordName: id, recordChangeTag: revision }
    }
  ])
  return { ok: true }
}
