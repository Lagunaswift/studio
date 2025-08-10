declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SENTRY_DSN: string;
    NEXT_PUBLIC_GA_ID: string;
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
  }
}
