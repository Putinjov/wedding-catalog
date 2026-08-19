import type { PayloadRequest } from 'payload'

export async function wasAppointmentOperationApplied(
  req: PayloadRequest,
  idempotencyKey: string,
): Promise<boolean> {
  const result = await req.payload.find({
    collection: 'appointment-audits',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { idempotencyKey: { equals: idempotencyKey } },
  })

  return result.totalDocs > 0
}

export function isDuplicateAppointmentOperationError(error: unknown): boolean {
  return error instanceof Error && /duplicate|idempotencyKey.*unique/i.test(error.message)
}
