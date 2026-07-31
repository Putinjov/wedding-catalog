import {
  ValidationError,
  type CollectionBeforeValidateHook,
  type FieldHook,
  type ValidationFieldError,
} from 'payload'

import type { Dress } from '@/payload-types'

function isPositiveMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getAltText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function populateGalleryAltText(
  data: Partial<Dress>,
  originalDoc?: Dress | null,
): Partial<Dress> {
  const gallery = data.gallery ?? originalDoc?.gallery
  const name = getAltText(data.name) ?? getAltText(originalDoc?.name)
  if (!gallery || !name) return data

  let changed = false
  const populatedGallery = gallery.map((row) => {
    if (getAltText(row.alt)) return row

    changed = true
    return {
      ...row,
      alt: name,
    }
  })

  return changed ? { ...data, gallery: populatedGallery } : data
}

export function getDressBusinessValidationErrors(
  dress: Partial<Dress>,
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = []
  const saleEnabled = dress.saleStatus != null && dress.saleStatus !== 'not-for-sale'
  const rentalEnabled = dress.rentalStatus != null && dress.rentalStatus !== 'not-for-rent'
  const hasSalePrice = dress.salePrice != null
  const priceOnRequest = dress.salePriceOnRequest === true

  if (hasSalePrice && !isPositiveMoney(dress.salePrice)) {
    errors.push({
      message: 'Sale price must be greater than zero.',
      path: 'salePrice',
    })
  }

  if (saleEnabled && !hasSalePrice && !priceOnRequest) {
    errors.push({
      message: 'Enter a sale price or select Price on request.',
      path: 'salePrice',
    })
  }

  if (saleEnabled && hasSalePrice && priceOnRequest) {
    errors.push({
      message: 'Price on request cannot be selected when a sale price is entered.',
      path: 'salePriceOnRequest',
    })
  }

  if (dress.previousSalePrice != null) {
    if (!isPositiveMoney(dress.salePrice)) {
      errors.push({
        message: 'Enter a valid sale price before adding a previous sale price.',
        path: 'previousSalePrice',
      })
    } else if (dress.previousSalePrice <= dress.salePrice) {
      errors.push({
        message: 'Previous sale price must be greater than the current sale price.',
        path: 'previousSalePrice',
      })
    }
  }

  if (rentalEnabled && !isPositiveMoney(dress.rentalPrice)) {
    errors.push({
      message: 'Rental price must be greater than zero when rental is enabled.',
      path: 'rentalPrice',
    })
  }

  if (
    dress.securityDeposit != null &&
    (!Number.isFinite(dress.securityDeposit) || dress.securityDeposit < 0)
  ) {
    errors.push({
      message: 'Security deposit cannot be negative.',
      path: 'securityDeposit',
    })
  }

  if (
    dress.publicVisibility === 'public' &&
    dress.saleStatus === 'not-for-sale' &&
    dress.rentalStatus === 'not-for-rent'
  ) {
    errors.push({
      message: 'A public dress must support sale, rental, or both.',
      path: 'publicVisibility',
    })
  }

  if (
    (dress.condition === 'needs-cleaning' || dress.condition === 'needs-repair') &&
    dress.rentalStatus === 'available'
  ) {
    errors.push({
      message: 'A dress needing cleaning or repair cannot be available for rental.',
      path: 'rentalStatus',
    })
  }

  dress.gallery?.forEach((row, index) => {
    if (!getAltText(row.alt)) {
      errors.push({
        message: 'Gallery alt text is required.',
        path: `gallery.${index}.alt`,
      })
    }
  })

  return errors
}

export const validateDressBusinessRules: CollectionBeforeValidateHook<Dress> = ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data

  const normalizedData = populateGalleryAltText(data, originalDoc)
  const effectiveDress = {
    ...originalDoc,
    ...normalizedData,
  }

  if (effectiveDress._status !== 'published') return normalizedData

  const errors = getDressBusinessValidationErrors(effectiveDress)
  if (errors.length > 0) {
    throw new ValidationError(
      {
        collection: 'dresses',
        errors,
        id: originalDoc?.id,
        req,
      },
      req.t,
    )
  }

  return normalizedData
}

export const rejectDuplicateDressSlug: FieldHook = async ({
  originalDoc,
  req,
  siblingData,
  value,
}) => {
  const slug = siblingData.slug
  if (typeof slug !== 'string' || slug.length === 0) return value

  const result = await req.payload.find({
    collection: 'dresses',
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })
  const currentID = originalDoc?.id == null ? null : String(originalDoc.id)
  const duplicate = result.docs.some((doc) => String(doc.id) !== currentID)

  if (duplicate) {
    throw new ValidationError(
      {
        collection: 'dresses',
        errors: [
          {
            message: 'A dress with this URL slug already exists.',
            path: 'slug',
          },
        ],
        id: originalDoc?.id,
        req,
      },
      req.t,
    )
  }

  return value
}
