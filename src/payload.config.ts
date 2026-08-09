import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, type PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { hasRole } from './access/roles'
import { AppointmentAudits } from './collections/AppointmentAudits'
import { AppointmentSlotLocks } from './collections/AppointmentSlotLocks'
import { Appointments } from './collections/Appointments'
import { Categories } from './collections/Categories'
import { Dresses } from './collections/Dresses'
import { EmailDeliveries } from './collections/EmailDeliveries'
import { Backs } from './collections/Lookups/Backs'
import { BookingSettings } from './BookingSettings/config'
import { Colors } from './collections/Lookups/Colors'
import { Designers } from './collections/Lookups/Designers'
import { Embellishments } from './collections/Lookups/Embellishments'
import { Fabrics } from './collections/Lookups/Fabrics'
import { Necklines } from './collections/Lookups/Necklines'
import { Sleeves } from './collections/Lookups/Sleeves'
import { Silhouettes } from './collections/Lookups/Silhouettes'
import { Sizes } from './collections/Lookups/Sizes'
import { Trains } from './collections/Lookups/Trains'
import { Waistlines } from './collections/Lookups/Waistlines'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { ProcessedStripeEvents } from './collections/ProcessedStripeEvents'
import { Users } from './collections/Users'
import { getServerEnvironment, isR2Configured } from './config/env'
import { getEmailAdapter } from './config/email'
import { normalizePublicAssetOrigin } from './config/site-url'
import { Footer } from './Footer/config'
import { defaultLexical } from './fields/defaultLexical'
import { Header } from './Header/config'
import { cleanupExpiredAppointmentHoldsTask } from './jobs/cleanupExpiredAppointmentHolds'
import { sendAppointmentEmailTask } from './jobs/sendAppointmentEmail'
import { migrateLegacyUserRoles } from './lib/security/migrateLegacyUserRoles'
import { plugins } from './plugins'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const environment = getServerEnvironment()
const r2Enabled = isR2Configured(environment)
const r2PublicOrigin = normalizePublicAssetOrigin(environment.R2_PUBLIC_URL)

function getR2FileURL(filename: string, prefix?: string): string {
  if (!r2PublicOrigin) return `/api/media/file/${encodeURIComponent(filename)}`

  const key = [prefix, filename]
    .filter((segment): segment is string => Boolean(segment))
    .flatMap((segment) => segment.split('/'))
    .map(encodeURIComponent)
    .join('/')

  return `${r2PublicOrigin}/${key}`
}

export default buildConfig({
  localization: {
    locales: ['en', 'uk'],
    defaultLocale: 'en',
    fallback: true,
  },
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
      beforeNavLinks: ['@/components/admin/appointments-calendar/bookings-nav#BookingsNav'],
      views: {
        appointmentsCalendar: {
          Component:
            '@/components/admin/appointments-calendar/appointments-calendar-view#AppointmentsCalendarView',
          exact: true,
          meta: {
            title: 'Appointments calendar',
          },
          path: '/appointments-calendar',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    connectOptions: {
      autoIndex: process.env.PAYLOAD_MIGRATING !== 'true',
    },
    url: environment.DATABASE_URL ?? '',
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Sizes,
    Colors,
    Fabrics,
    Silhouettes,
    Designers,
    Necklines,
    Sleeves,
    Trains,
    Backs,
    Waistlines,
    Embellishments,
    Dresses,
    Appointments,
    EmailDeliveries,
    AppointmentAudits,
    AppointmentSlotLocks,
    ProcessedStripeEvents,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  email: getEmailAdapter(environment),
  globals: [Header, Footer, BookingSettings],
  plugins: [
    ...plugins,
    s3Storage({
      alwaysInsertFields: true,
      bucket: environment.R2_BUCKET ?? 'r2-disabled',
      clientUploads: true,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => getR2FileURL(filename, prefix),
          prefix: 'media',
        },
      },
      config: {
        credentials: {
          accessKeyId: environment.R2_ACCESS_KEY_ID ?? 'r2-disabled',
          secretAccessKey: environment.R2_SECRET_ACCESS_KEY ?? 'r2-disabled',
        },
        endpoint: environment.R2_ENDPOINT,
        forcePathStyle: true,
        region: 'auto',
      },
      disableLocalStorage: r2Enabled,
      enabled: r2Enabled,
    }),
  ],
  onInit: migrateLegacyUserRoles,
  secret: environment.PAYLOAD_SECRET ?? '',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (hasRole(req.user, ['owner'])) return true

        const secret = environment.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    enableConcurrencyControl: true,
    tasks: [cleanupExpiredAppointmentHoldsTask, sendAppointmentEmailTask],
  },
})
