export const imageQualities = [65, 75, 85, 90] as const

export type ImageQuality = (typeof imageQualities)[number]

export const defaultImageQuality: ImageQuality = 75
export const mainGalleryImageQuality: ImageQuality = 85
