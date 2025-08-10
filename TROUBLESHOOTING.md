# Firebase Connectivity Troubleshooting

This document outlines a specific issue encountered with Firebase connectivity and the steps taken to resolve it.

## The Problem

The application was failing to connect to Firebase services, resulting in the following error in the browser console:

```
Firebase: Error (auth/network-request-failed)
```

This indicated that the application's authentication requests were not reaching the Firebase Authentication service.

## The Investigation

1.  **Initial Checks**: We first ran a series of `curl` commands to test connectivity to the Firebase services. All commands resulted in `404 Not Found` errors, suggesting a problem with the Firebase project configuration or that the services had not been fully provisioned.

2.  **Configuration Review**: We examined the `firebase.json` file and found that it was missing a `hosting` section. While this was a problem for deployment, it didn't fully explain the `auth/network-request-failed` error during local development.

3.  **Environment Variables**: We then checked the environment variables in `.env.local` and found that while the Firebase project credentials were set, the `NEXT_PUBLIC_EMULATOR_HOST` environment variable was not being correctly detected by the application. This was the key to the problem.

## The Cause

The application was attempting to connect to the *production* Firebase backend, which was not yet fully configured, instead of the *local* Firebase emulators. This was because the logic in `src/lib/firebase.ts` was not correctly identifying when to connect to the emulators.

## The Solution

We implemented a multi-step solution to fix the problem:

1.  **Forced Production Mode (Temporary)**: To isolate the problem, we temporarily hardcoded the application to run in production mode by changing the conditional check in `src/lib/firebase.ts` to `if (false)`. This confirmed that the production credentials were correct and that the issue was with the emulator detection.

2.  **Permanent Emulator Detection Fix**: We replaced the temporary fix with a more robust check in `src/lib/firebase.ts`. The new logic checks if the app is running on `localhost` and if the `NEXT_PUBLIC_EMULATOR_HOST` environment variable is set. This ensures that the app will correctly connect to the emulators during local development.

    ```typescript
    // src/lib/firebase.ts
    const isEmulatorMode = typeof window !== 'undefined' &&
      window.location.hostname === 'localhost' &&
      process.env.NEXT_PUBLIC_EMULATOR_HOST;

    if (isEmulatorMode) {
      // ... emulator connection logic
    }
    ```

3.  **Added Hosting Configuration**: Finally, we added the necessary `hosting` configuration to `firebase.json` to enable deployment and ensure that the Data Connect service would work correctly.

    ```json
    // firebase.json
    "hosting": {
      "source": ".",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "frameworksBackend": {
        "region": "us-central1"
      },
      "rewrites": [
        {
          "source": "/dataconnect",
          "dataconnect": {
            "serviceId": "dataconnect"
          }
        }
      ]
    },
    ```

By taking these steps, we were able to resolve the connectivity issues and ensure that the application can now correctly connect to both the local Firebase emulators and the production Firebase backend.
