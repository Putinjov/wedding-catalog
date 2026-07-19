declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      PREVIEW_SECRET: string
      STRIPE_SECRET_KEY: string
      STRIPE_WEBHOOK_SECRET: string
      CRON_SECRET: string
      R2_BUCKET: string
      R2_ACCESS_KEY_ID: string
      R2_SECRET_ACCESS_KEY: string
      R2_ENDPOINT: string
      R2_PUBLIC_URL: string
      VERCEL_ENV?: 'development' | 'preview' | 'production'
      VERCEL_PROJECT_PRODUCTION_URL: string
      VERCEL_URL?: string
      __NEXT_PRIVATE_ORIGIN?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
