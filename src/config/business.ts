export const publicBusinessAddress = {
  addressCountry: 'IE',
  addressLocality: 'BIRR',
  addressRegion: 'CO. OFFALY',
  postalCode: 'R42 YX50',
  streetAddress: "JOHN'S PLACE",
} as const

export const publicBusinessAddressLines = [
  publicBusinessAddress.streetAddress,
  publicBusinessAddress.addressLocality,
  publicBusinessAddress.addressRegion,
  publicBusinessAddress.postalCode,
] as const

export const publicBusinessAddressText = publicBusinessAddressLines.join('\n')

export const publicBusinessLogoPath = '/brand/cait-bridal-logo.jpeg'

export const publicBusinessGeo = {
  latitude: 53.095985,
  longitude: -7.90994,
} as const

export const publicBusinessPhone = '+353833315515'
export const publicBusinessPhoneDisplay = '+353 83 331 5515'

export const publicBusinessMapUrl =
  'https://www.google.com/maps/search/?api=1&query=JOHN%27S%20PLACE%2C%20BIRR%2C%20CO.%20OFFALY%2C%20R42%20YX50'

export const publicBusinessSocialProfiles = [
  {
    label: 'Instagram',
    url: 'https://www.instagram.com/cait_bridal/',
  },
  {
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61591677917110',
  },
  {
    label: 'TikTok',
    url: 'https://www.tiktok.com/@cait_bridal',
  },
] as const
