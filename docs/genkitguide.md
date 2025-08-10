Deploy flows using Cloud Functions for Firebase
Cloud Functions for Firebase has an onCallGenkit method that lets you quickly create a callable function with a Genkit action (e.g. a Flow). These functions can be called using genkit/beta/clientor the Functions client SDK, which automatically adds auth info.

Before you begin
You should be familiar with Genkit’s concept of flows, and how to write them. The instructions on this page assume that you already have some flows defined, which you want to deploy.
It would be helpful, but not required, if you’ve already used Cloud Functions for Firebase before.
1. Set up a Firebase project
If you don’t already have a Firebase project with TypeScript Cloud Functions set up, follow these steps:

Create a new Firebase project using the Firebase console or choose an existing one.

Upgrade the project to the Blaze plan, which is required to deploy Cloud Functions.

Install the Firebase CLI.

Log in with the Firebase CLI:

Terminal window
firebase login

firebase login --reauth # alternative, if necessary

firebase login --no-localhost # if running in a remote shell

Create a new project directory:

Terminal window
export PROJECT_ROOT=~/tmp/genkit-firebase-project1

mkdir -p $PROJECT_ROOT

Initialize a Firebase project in the directory:

Terminal window
cd $PROJECT_ROOT

firebase init genkit

The rest of this page assumes that you’ve decided to write your functions in TypeScript, but you can also deploy your Genkit flows if you’re using JavaScript.

2. Wrap the Flow in onCallGenkit
After you’ve set up a Firebase project with Cloud Functions, you can copy or write flow definitions in the project’s functions/src directory, and export them in index.ts.

For your flows to be deployable, you need to wrap them in onCallGenkit. This method has all the features of the normal onCall. It automatically supports both streaming and JSON responses.

Suppose you have the following flow:

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

You can expose this flow as a callable function using onCallGenkit:

import { onCallGenkit } from 'firebase-functions/https';

export generatePoem = onCallGenkit(generatePoemFlow);

Define an authorization policy
All deployed flows, whether deployed to Firebase or not, should have an authorization policy; without one, anyone can invoke your potentially-expensive generative AI flows. To define an authorization policy, use the authPolicy parameter of onCallGenkit:

export const generatePoem = onCallGenkit(
  {
    authPolicy: (auth) => auth?.token?.email_verified,
  },
  generatePoemFlow,
);

This sample uses a manual function as its auth policy. In addition, the https library exports the signedIn() and hasClaim() helpers. Here is the same code using one of those helpers:

import { hasClaim } from 'firebase-functions/https';

export const generatePoem = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
  },
  generatePoemFlow,
);

Make API credentials available to deployed flows
Once deployed, your flows need some way to authenticate with any remote services they rely on. Most flows need, at a minimum, credentials for accessing the model API service they use.

For this example, do one of the following, depending on the model provider you chose:

Gemini (Google AI)
Gemini (Vertex AI)
Make sure Google AI is available in your region.

Generate an API key for the Gemini API using Google AI Studio.

Store your API key in Cloud Secret Manager:

Terminal window
firebase functions:secrets:set GEMINI_API_KEY

This step is important to prevent accidentally leaking your API key, which grants access to a potentially metered service.

See Store and access sensitive configuration information for more information on managing secrets.

Edit src/index.ts and add the following after the existing imports:

import { defineSecret } from "firebase-functions/params";
const googleAIapiKey = defineSecret("GEMINI_API_KEY");

Then, in the flow definition, declare that the cloud function needs access to this secret value:

export const generatePoem = onCallGenkit(
  {
    secrets: [googleAIapiKey],
  },
  generatePoemFlow
);

Now, when you deploy this function, your API key is stored in Cloud Secret Manager, and available from the Cloud Functions environment.

The only secret you need to set up for this tutorial is for the model provider, but in general, you must do something similar for each service your flow uses.

Add App Check enforcement
Firebase App Check uses a built-in attestation mechanism to verify that your API is only being called by your application. onCallGenkit supports App Check enforcement declaratively.

export const generatePoem = onCallGenkit(
  {
    enforceAppCheck: true,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: true,
  },
  generatePoemFlow,
);

Set a CORS policy
Callable functions default to allowing any domain to call your function. If you want to customize the domains that can do this, use the cors option. With proper authentication (especially App Check), CORS is often unnecessary.

export const generatePoem = onCallGenkit(
  {
    cors: 'mydomain.com',
  },
  generatePoemFlow,
);

Complete example
After you’ve made all of the changes described earlier, your deployable flow looks something like the following example:

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

export const generatePoem = onCallGenkit(
  {
    secrets: [apiKey],
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  generatePoemFlow,
);

3. Deploy flows to Firebase
After you’ve defined flows using onCallGenkit, you can deploy them the same way you would deploy other Cloud Functions:

Terminal window
cd $PROJECT_ROOT

firebase deploy --only functions

You’ve now deployed the flow as a Cloud Function! But you can’t access your deployed endpoint with curl or similar, because of the flow’s authorization policy. The next section explains how to securely access the flow.

Optional: Try the deployed flow
To try out your flow endpoint, you can deploy the following minimal example web app:

In the Project settings section of the Firebase console, add a new web app, selecting the option to also set up Hosting.

In the Authentication section of the Firebase console, enable the Google provider, used in this example.

In your project directory, set up Firebase Hosting, where you will deploy the sample app:

Terminal window
cd $PROJECT_ROOT

firebase init hosting

Accept the defaults for all of the prompts.

Replace public/index.html with the following:

<!DOCTYPE html>
<html>
  <head>
    <title>Genkit demo</title>
  </head>
  <body>
    <div id="signin" hidden>
      <button id="signinBtn">Sign in with Google</button>
    </div>
    <div id="callGenkit" hidden>
      Subject: <input type="text" id="subject" />
      <button id="generatePoem">Compose a poem on this subject</button>
      <p id="generatedPoem"></p>
    </div>
    <script type="module">
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
      import {
        getAuth,
        onAuthStateChanged,
        GoogleAuthProvider,
        signInWithPopup,
      } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
      import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

      const firebaseConfig = await fetch('/__/firebase/init.json');
      initializeApp(await firebaseConfig.json());

      async function generatePoem() {
        const poemFlow = httpsCallable(getFunctions(), 'generatePoem');
        const subject = document.querySelector('#subject').value;
        const response = await poemFlow({ subject });
        document.querySelector('#generatedPoem').innerText = response.data.poem;
      }

      function signIn() {
        signInWithPopup(getAuth(), new GoogleAuthProvider());
      }

      document.querySelector('#signinBtn').addEventListener('click', signIn);
      document.querySelector('#generatePoem').addEventListener('click', generatePoem);

      const signinEl = document.querySelector('#signin');
      const genkitEl = document.querySelector('#callGenkit');

      onAuthStateChanged(getAuth(), (user) => {
        if (!user) {
          signinEl.hidden = false;
          genkitEl.hidden = true;
        } else {
          signinEl.hidden = true;
          genkitEl.hidden = false;
        }
      });
    </script>
  </body>
</html>

Deploy the web app and Cloud Function:

Terminal window
cd $PROJECT_ROOT

firebase deploy

Open the web app by visiting the URL printed by the deploy command. The app requires you to sign in with a Google account, after which you can initiate endpoint requests.

Optional: Run flows in the developer UI
You can run flows defined using onCallGenkit in the developer UI, exactly the same way as you run flows defined using defineFlow, so there’s no need to switch between the two between deployment and development.

Terminal window
cd $PROJECT_ROOT/functions

genkit start -- npx tsx --watch src/index.ts

or

Terminal window
cd $PROJECT_ROOT/functions

npm run genkit:start

You can now navigate to the URL printed by the genkit start command to access.

Optional: Developing using Firebase Local Emulator Suite
Firebase offers a suite of emulators for local development, which you can use with Genkit.

To use the Genkit Dev UI with the Firebase Emulator Suite, start the Firebase emulators as follows:

Terminal window
genkit start -- firebase emulators:start --inspect-functions

This command runs your code in the emulator, and runs the Genkit framework in development mode. This launches and exposes the Genkit reflection API (but not the Dev UI).

Deploy flows using Cloud Functions for Firebase
Cloud Functions for Firebase has an onCallGenkit method that lets you quickly create a callable function with a Genkit action (e.g. a Flow). These functions can be called using genkit/beta/clientor the Functions client SDK, which automatically adds auth info.

Before you begin
You should be familiar with Genkit’s concept of flows, and how to write them. The instructions on this page assume that you already have some flows defined, which you want to deploy.
It would be helpful, but not required, if you’ve already used Cloud Functions for Firebase before.
1. Set up a Firebase project
If you don’t already have a Firebase project with TypeScript Cloud Functions set up, follow these steps:

Create a new Firebase project using the Firebase console or choose an existing one.

Upgrade the project to the Blaze plan, which is required to deploy Cloud Functions.

Install the Firebase CLI.

Log in with the Firebase CLI:

Terminal window
firebase login

firebase login --reauth # alternative, if necessary

firebase login --no-localhost # if running in a remote shell

Create a new project directory:

Terminal window
export PROJECT_ROOT=~/tmp/genkit-firebase-project1

mkdir -p $PROJECT_ROOT

Initialize a Firebase project in the directory:

Terminal window
cd $PROJECT_ROOT

firebase init genkit

The rest of this page assumes that you’ve decided to write your functions in TypeScript, but you can also deploy your Genkit flows if you’re using JavaScript.

2. Wrap the Flow in onCallGenkit
After you’ve set up a Firebase project with Cloud Functions, you can copy or write flow definitions in the project’s functions/src directory, and export them in index.ts.

For your flows to be deployable, you need to wrap them in onCallGenkit. This method has all the features of the normal onCall. It automatically supports both streaming and JSON responses.

Suppose you have the following flow:

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

You can expose this flow as a callable function using onCallGenkit:

import { onCallGenkit } from 'firebase-functions/https';

export generatePoem = onCallGenkit(generatePoemFlow);

Define an authorization policy
All deployed flows, whether deployed to Firebase or not, should have an authorization policy; without one, anyone can invoke your potentially-expensive generative AI flows. To define an authorization policy, use the authPolicy parameter of onCallGenkit:

export const generatePoem = onCallGenkit(
  {
    authPolicy: (auth) => auth?.token?.email_verified,
  },
  generatePoemFlow,
);

This sample uses a manual function as its auth policy. In addition, the https library exports the signedIn() and hasClaim() helpers. Here is the same code using one of those helpers:

import { hasClaim } from 'firebase-functions/https';

export const generatePoem = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
  },
  generatePoemFlow,
);

Make API credentials available to deployed flows
Once deployed, your flows need some way to authenticate with any remote services they rely on. Most flows need, at a minimum, credentials for accessing the model API service they use.

For this example, do one of the following, depending on the model provider you chose:

Gemini (Google AI)
Gemini (Vertex AI)
Make sure Google AI is available in your region.

Generate an API key for the Gemini API using Google AI Studio.

Store your API key in Cloud Secret Manager:

Terminal window
firebase functions:secrets:set GEMINI_API_KEY

This step is important to prevent accidentally leaking your API key, which grants access to a potentially metered service.

See Store and access sensitive configuration information for more information on managing secrets.

Edit src/index.ts and add the following after the existing imports:

import { defineSecret } from "firebase-functions/params";
const googleAIapiKey = defineSecret("GEMINI_API_KEY");

Then, in the flow definition, declare that the cloud function needs access to this secret value:

export const generatePoem = onCallGenkit(
  {
    secrets: [googleAIapiKey],
  },
  generatePoemFlow
);

Now, when you deploy this function, your API key is stored in Cloud Secret Manager, and available from the Cloud Functions environment.

The only secret you need to set up for this tutorial is for the model provider, but in general, you must do something similar for each service your flow uses.

Add App Check enforcement
Firebase App Check uses a built-in attestation mechanism to verify that your API is only being called by your application. onCallGenkit supports App Check enforcement declaratively.

export const generatePoem = onCallGenkit(
  {
    enforceAppCheck: true,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: true,
  },
  generatePoemFlow,
);

Set a CORS policy
Callable functions default to allowing any domain to call your function. If you want to customize the domains that can do this, use the cors option. With proper authentication (especially App Check), CORS is often unnecessary.

export const generatePoem = onCallGenkit(
  {
    cors: 'mydomain.com',
  },
  generatePoemFlow,
);

Complete example
After you’ve made all of the changes described earlier, your deployable flow looks something like the following example:

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

export const generatePoem = onCallGenkit(
  {
    secrets: [apiKey],
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  generatePoemFlow,
);

3. Deploy flows to Firebase
After you’ve defined flows using onCallGenkit, you can deploy them the same way you would deploy other Cloud Functions:

Terminal window
cd $PROJECT_ROOT

firebase deploy --only functions

You’ve now deployed the flow as a Cloud Function! But you can’t access your deployed endpoint with curl or similar, because of the flow’s authorization policy. The next section explains how to securely access the flow.

Optional: Try the deployed flow
To try out your flow endpoint, you can deploy the following minimal example web app:

In the Project settings section of the Firebase console, add a new web app, selecting the option to also set up Hosting.

In the Authentication section of the Firebase console, enable the Google provider, used in this example.

In your project directory, set up Firebase Hosting, where you will deploy the sample app:

Terminal window
cd $PROJECT_ROOT

firebase init hosting

Accept the defaults for all of the prompts.

Replace public/index.html with the following:

<!DOCTYPE html>
<html>
  <head>
    <title>Genkit demo</title>
  </head>
  <body>
    <div id="signin" hidden>
      <button id="signinBtn">Sign in with Google</button>
    </div>
    <div id="callGenkit" hidden>
      Subject: <input type="text" id="subject" />
      <button id="generatePoem">Compose a poem on this subject</button>
      <p id="generatedPoem"></p>
    </div>
    <script type="module">
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
      import {
        getAuth,
        onAuthStateChanged,
        GoogleAuthProvider,
        signInWithPopup,
      } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
      import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

      const firebaseConfig = await fetch('/__/firebase/init.json');
      initializeApp(await firebaseConfig.json());

      async function generatePoem() {
        const poemFlow = httpsCallable(getFunctions(), 'generatePoem');
        const subject = document.querySelector('#subject').value;
        const response = await poemFlow({ subject });
        document.querySelector('#generatedPoem').innerText = response.data.poem;
      }

      function signIn() {
        signInWithPopup(getAuth(), new GoogleAuthProvider());
      }

      document.querySelector('#signinBtn').addEventListener('click', signIn);
      document.querySelector('#generatePoem').addEventListener('click', generatePoem);

      const signinEl = document.querySelector('#signin');
      const genkitEl = document.querySelector('#callGenkit');

      onAuthStateChanged(getAuth(), (user) => {
        if (!user) {
          signinEl.hidden = false;
          genkitEl.hidden = true;
        } else {
          signinEl.hidden = true;
          genkitEl.hidden = false;
        }
      });
    </script>
  </body>
</html>

Deploy the web app and Cloud Function:

Terminal window
cd $PROJECT_ROOT

firebase deploy

Open the web app by visiting the URL printed by the deploy command. The app requires you to sign in with a Google account, after which you can initiate endpoint requests.

Optional: Run flows in the developer UI
You can run flows defined using onCallGenkit in the developer UI, exactly the same way as you run flows defined using defineFlow, so there’s no need to switch between the two between deployment and development.

Terminal window
cd $PROJECT_ROOT/functions

genkit start -- npx tsx --watch src/index.ts

or

Terminal window
cd $PROJECT_ROOT/functions

npm run genkit:start

You can now navigate to the URL printed by the genkit start command to access.

Optional: Developing using Firebase Local Emulator Suite
Firebase offers a suite of emulators for local development, which you can use with Genkit.

To use the Genkit Dev UI with the Firebase Emulator Suite, start the Firebase emulators as follows:

Terminal window
genkit start -- firebase emulators:start --inspect-functions

This command runs your code in the emulator, and runs the Genkit framework in development mode. This launches and exposes the Genkit reflection API (but not the Dev UI).



Genkit provides a unified interface to interact with various generative AI models (LLMs, image generation).

Core Function: ai.generate()

Basic Usage:

import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'), // Default model
});

// Generate with default model
const response1 = await ai.generate('prompt text');
console.log(response1.text);

// Generate with specific model reference
import { googleAI } from '@genkit-ai/googleai';
const response2 = await ai.generate({
  model: googleAI.model('gemini-2.5-flash'),
  prompt: 'prompt text',
});
console.log(response2.text);

// Generate with model string ID
const response3 = await ai.generate({
  model: 'googleai/gemini-2.5-flash',
  prompt: 'prompt text',
});
console.log(response3.text);

Configuration:

System Prompt: system: "Instruction for the model"
Model Parameters: config: { maxOutputTokens: 512, temperature: 1.0, topP: 0.95, topK: 40, stopSequences: ["\n"] }
Structured Output (using Zod):

import { z } from 'genkit';

const MenuItemSchema = z.object({
  name: z.string().describe('The name of the menu item.'),
  description: z.string().describe('A description of the menu item.'),
  calories: z.number().describe('The estimated number of calories.'),
  allergens: z.array(z.string()).describe('Any known allergens in the menu item.'),
});

const response = await ai.generate({
  prompt: 'Suggest a menu item.',
  output: { schema: MenuItemSchema },
});

const menuItem = response.output; // Typed output, might be null if validation fails
if (menuItem) {
  console.log(menuItem.name);
}

Streaming:

const { stream, response } = ai.generateStream({
  prompt: 'Tell a story.',
  // Can also include output schema for streaming structured data
  // output: { schema: z.array(MenuItemSchema) },
});

// Stream text chunks
for await (const chunk of stream) {
  console.log(chunk.text); // For structured: chunk.output (accumulated)
}

// Get final complete response
const finalResponse = await response;
console.log(finalResponse.text); // For structured: finalResponse.output

Multimodal Input:

import { readFile } from 'node:fs/promises';

// From URL
const response1 = await ai.generate({
  prompt: [{ media: { url: 'https://.../image.jpg' } }, { text: 'Describe this image.' }],
});

// From local file (data URL)
const data = await readFile('image.jpg');
const response2 = await ai.generate({
  prompt: [{ media: { url: `data:image/jpeg;base64,${data.toString('base64')}` } }, { text: 'Describe this image.' }],
});

Media Generation (e.g., Images):

import { vertexAI } from '@genkit-ai/vertexai'; // Example image model
import { parseDataUrl } from 'data-urls';
import { writeFile } from 'node:fs/promises';

const response = await ai.generate({
  model: vertexAI.model('imagen-3.0-fast-generate-001'),
  prompt: 'Image description',
  output: { format: 'media' }, // Request media output
});

const imagePart = response.output;
if (imagePart?.media?.url) {
  // URL is typically a data: URL
  const parsed = parseDataUrl(imagePart.media.url);
  if (parsed) {
    await writeFile('output.png', parsed.body);
  }
}

Supported Model Plugins (Examples):

Vertex AI (@genkit-ai/vertexai): Gemini, Imagen, Claude on Vertex
Google AI (@genkit-ai/googleai): Gemini
OpenAI (@genkit-ai/compat-oai/openai): GPT, Dall-E, Whisper on OpenAI
xAI (@genkit-ai/compat-oai/xai): Grok on xAI
DeepSeek (@genkit-ai/compat-oai/deepseek): DeepSeek Chat, Reasoner on DeepSeek
Ollama (@genkit-ai/ollama): Llama 3, Gemma 2, etc. (self-hosted)
Community: Anthropic, Azure OpenAI, Cohere, Mistral, Groq
Key Concepts:

Flexibility: Easily swap models (model parameter).
Zod: For defining and validating structured output schemas.
Streaming: For real-time output using generateStream.
Multimodality: Handle text, image, video, audio inputs (model-dependent).
Media Generation: Create images, etc. (model-dependent).

Passing information through context
Genkit by Example: Action Context
See how action context can guide and secure workflows in a live demo.
There are different categories of information that a developer working with an LLM may be handling simultaneously:

Input: Information that is directly relevant to guide the LLM’s response for a particular call. An example of this is the text that needs to be summarized.
Generation Context: Information that is relevant to the LLM, but isn’t specific to the call. An example of this is the current time or a user’s name.
Execution Context: Information that is important to the code surrounding the LLM call but not to the LLM itself. An example of this is a user’s current auth token.
Genkit provides a consistent context object that can propagate generation and execution context throughout the process. This context is made available to all actions including flows, tools, and prompts.

Context is automatically propagated to all actions called within the scope of execution: Context passed to a flow is made available to prompts executed within the flow. Context passed to the generate() method is available to tools called within the generation loop.

Why is context important?
As a best practice, you should provide the minimum amount of information to the LLM that it needs to complete a task. This is important for multiple reasons:

The less extraneous information the LLM has, the more likely it is to perform well at its task.
If an LLM needs to pass around information like user or account IDs to tools, it can potentially be tricked into leaking information.
Context gives you a side channel of information that can be used by any of your code but doesn’t necessarily have to be sent to the LLM. As an example, it can allow you to restrict tool queries to the current user’s available scope.

Context structure
Context must be an object, but its properties are yours to decide. In some situations Genkit automatically populates context. For example, when using persistent sessions the state property is automatically added to context.

One of the most common uses of context is to store information about the current user. We recommend adding auth context in the following format:

{
  auth: {
    uid: "...", // the user's unique identifier
    token: {...}, // the decoded claims of a user's id token
    rawToken: "...", // the user's raw encoded id token
    // ...any other fields
  }
}

The context object can store any information that you might need to know somewhere else in the flow of execution.

Use context in an action
To use context within an action, you can access the context helper that is automatically supplied to your function definition:

Flow
Tool
Prompt file
const summarizeHistory = ai.defineFlow({
  name: 'summarizeMessages',
  inputSchema: z.object({friendUid: z.string()}),
  outputSchema: z.string()
}, async ({friendUid}, {context}) => {
  if (!context.auth?.uid) throw new Error("Must supply auth context.");
  const messages = await listMessagesBetween(friendUid, context.auth.uid);
  const {text} = await ai.generate({
    prompt:
      `Summarize the content of these messages: ${JSON.stringify(messages)}`,
  });
  return text;
});

Provide context at runtime
To provide context to an action, you pass the context object as an option when calling the action.

Flows
Generation
Prompts
const summarizeHistory = ai.defineFlow(/* ... */);

const summary = await summarizeHistory(friend.uid, {
  context: { auth: currentUser },
});

Context propagation and overrides
By default, when you provide context it is automatically propagated to all actions called as a result of your original call. If your flow calls other flows, or your generation calls tools, the same context is provided.

If you wish to override context within an action, you can pass a different context object to replace the existing one:

const otherFlow = ai.defineFlow(/* ... */);

const myFlow = ai.defineFlow(
  {
    // ...
  },
  (input, { context }) => {
    // override the existing context completely
    otherFlow(
      {
        /*...*/
      },
      { context: { newContext: true } },
    );
    // or selectively override
    otherFlow(
      {
        /*...*/
      },
      { context: { ...context, updatedContext: true } },
    );
  },
);

When context is replaced, it propagates the same way. In this example, any actions that otherFlow called during its execution would inherit the overridden context.

Defining AI workflows
The core of your app’s AI features are generative model requests, but it’s rare that you can simply take user input, pass it to the model, and display the model output back to the user. Usually, there are pre- and post-processing steps that must accompany the model call. For example:

Retrieving contextual information to send with the model call
Retrieving the history of the user’s current session, for example in a chat app
Using one model to reformat the user input in a way that’s suitable to pass to another model
Evaluating the “safety” of a model’s output before presenting it to the user
Combining the output of several models
Every step of this workflow must work together for any AI-related task to succeed.

In Genkit, you represent this tightly-linked logic using a construction called a flow. Flows are written just like functions, using ordinary TypeScript code, but they add additional capabilities intended to ease the development of AI features:

Type safety: Input and output schemas defined using Zod, which provides both static and runtime type checking
Integration with developer UI: Debug flows independently of your application code using the developer UI. In the developer UI, you can run flows and view traces for each step of the flow.
Simplified deployment: Deploy flows directly as web API endpoints, using Cloud Functions for Firebase or any platform that can host a web app.
Unlike similar features in other frameworks, Genkit’s flows are lightweight and unobtrusive, and don’t force your app to conform to any specific abstraction. All of the flow’s logic is written in standard TypeScript, and code inside a flow doesn’t need to be flow-aware.

Defining and calling flows
In its simplest form, a flow just wraps a function. The following example wraps a function that calls generate():

export const menuSuggestionFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: z.object({ menuItem: z.string() }),
  },
  async ({ theme }) => {
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Invent a menu item for a ${theme} themed restaurant.`,
    });
    return { menuItem: text };
  },
);

Just by wrapping your generate() calls like this, you add some functionality: doing so lets you run the flow from the Genkit CLI and from the developer UI, and is a requirement for several of Genkit’s features, including deployment and observability (later sections discuss these topics).

Input and output schemas
One of the most important advantages Genkit flows have over directly calling a model API is type safety of both inputs and outputs. When defining flows, you can define schemas for them using Zod, in much the same way as you define the output schema of a generate() call; however, unlike with generate(), you can also specify an input schema.

While it’s not mandatory to wrap your input and output schemas in z.object(), it’s considered best practice for these reasons:

Better developer experience: Wrapping schemas in objects provides a better experience in the Developer UI by giving you labeled input fields.
Future-proof API design: Object-based schemas allow for easy extensibility in the future. You can add new fields to your input or output schemas without breaking existing clients, which is a core principle of robust API design.
All examples in this documentation use object-based schemas to follow these best practices.

Here’s a refinement of the last example, which defines a flow that takes a string as input and outputs an object:

import { z } from 'genkit';

const MenuItemSchema = z.object({
  dishname: z.string(),
  description: z.string(),
});

export const menuSuggestionFlowWithSchema = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: MenuItemSchema,
  },
  async ({ theme }) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Invent a menu item for a ${theme} themed restaurant.`,
      output: { schema: MenuItemSchema },
    });
    if (output == null) {
      throw new Error("Response doesn't satisfy schema.");
    }
    return output;
  },
);

Note that the schema of a flow does not necessarily have to line up with the schema of the generate() calls within the flow (in fact, a flow might not even contain generate() calls). Here’s a variation of the example that passes a schema to generate(), but uses the structured output to format a simple string, which the flow returns.

export const menuSuggestionFlowMarkdown = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: z.object({ formattedMenuItem: z.string() }),
  },
  async ({ theme }) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Invent a menu item for a ${theme} themed restaurant.`,
      output: { schema: MenuItemSchema },
    });
    if (output == null) {
      throw new Error("Response doesn't satisfy schema.");
    }
    return {
      formattedMenuItem: `**${output.dishname}**: ${output.description}`
    };
  },
);

Calling flows
Once you’ve defined a flow, you can call it from your Node.js code:

const { text } = await menuSuggestionFlow({ theme: 'bistro' });

The argument to the flow must conform to the input schema, if you defined one.

If you defined an output schema, the flow response will conform to it. For example, if you set the output schema to MenuItemSchema, the flow output will contain its properties:

const { dishname, description } = await menuSuggestionFlowWithSchema({ theme: 'bistro' });

Streaming flows
Flows support streaming using an interface similar to generate()’s streaming interface. Streaming is useful when your flow generates a large amount of output, because you can present the output to the user as it’s being generated, which improves the perceived responsiveness of your app. As a familiar example, chat-based LLM interfaces often stream their responses to the user as they are generated.

Here’s an example of a flow that supports streaming:

export const menuSuggestionStreamingFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    streamSchema: z.string(),
    outputSchema: z.object({ theme: z.string(), menuItem: z.string() }),
  },
  async ({ theme }, { sendChunk }) => {
    const { stream, response } = ai.generateStream({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Invent a menu item for a ${theme} themed restaurant.`,
    });

    for await (const chunk of stream) {
      // Here, you could process the chunk in some way before sending it to
      // the output stream via sendChunk(). In this example, we output
      // the text of the chunk, unmodified.
      sendChunk(chunk.text);
    }

    const { text: menuItem } = await response;

    return {
      theme,
      menuItem,
    };
  },
);

The streamSchema option specifies the type of values your flow streams. This does not necessarily need to be the same type as the outputSchema, which is the type of the flow’s complete output.
The second parameter to your flow definition is called sideChannel. It provides features such as request context and the sendChunk callback. The sendChunk callback takes a single parameter, of the type specified by streamSchema. Whenever data becomes available within your flow, send the data to the output stream by calling this function.
In the above example, the values streamed by the flow are directly coupled to the values streamed by the generate() call inside the flow. Although this is often the case, it doesn’t have to be: you can output values to the stream using the callback as often as is useful for your flow.

Calling streaming flows
Streaming flows are also callable, but they immediately return a response object rather than a promise:

const response = menuSuggestionStreamingFlow.stream({ theme: 'Danube' });

The response object has a stream property, which you can use to iterate over the streaming output of the flow as it’s generated:

for await (const chunk of response.stream) {
  console.log('chunk', chunk);
}

You can also get the complete output of the flow, as you can with a non-streaming flow:

const output = await response.output;

Note that the streaming output of a flow might not be the same type as the complete output; the streaming output conforms to streamSchema, whereas the complete output conforms to outputSchema.

Running flows from the command line
You can run flows from the command line using the Genkit CLI tool:

Terminal window
genkit flow:run menuSuggestionFlow '{"theme": "French"}'

For streaming flows, you can print the streaming output to the console by adding the -s flag:

Terminal window
genkit flow:run menuSuggestionFlow '{"theme": "French"}' -s

Running a flow from the command line is useful for testing a flow, or for running flows that perform tasks needed on an ad hoc basis—for example, to run a flow that ingests a document into your vector database.

Debugging flows
One of the advantages of encapsulating AI logic within a flow is that you can test and debug the flow independently from your app using the Genkit developer UI.

To start the developer UI, run the following commands from your project directory:

Terminal window
genkit start -- tsx --watch src/your-code.ts

From the Run tab of developer UI, you can run any of the flows defined in your project:

Genkit DevUI flows

After you’ve run a flow, you can inspect a trace of the flow invocation by either clicking View trace or looking on the Inspect tab.

In the trace viewer, you can see details about the execution of the entire flow, as well as details for each of the individual steps within the flow. For example, consider the following flow, which contains several generation requests:

const PrixFixeMenuSchema = z.object({
  starter: z.string(),
  soup: z.string(),
  main: z.string(),
  dessert: z.string(),
});

export const complexMenuSuggestionFlow = ai.defineFlow(
  {
    name: 'complexMenuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: PrixFixeMenuSchema,
  },
  async ({ theme }): Promise<z.infer<typeof PrixFixeMenuSchema>> => {
    const chat = ai.chat({ model: googleAI.model('gemini-2.5-flash') });
    await chat.send('What makes a good prix fixe menu?');
    await chat.send(
      'What are some ingredients, seasonings, and cooking techniques that ' + `would work for a ${theme} themed menu?`,
    );
    const { output } = await chat.send({
      prompt: `Based on our discussion, invent a prix fixe menu for a ${theme} ` + 'themed restaurant.',
      output: {
        schema: PrixFixeMenuSchema,
      },
    });
    if (!output) {
      throw new Error('No data generated.');
    }
    return output;
  },
);

When you run this flow, the trace viewer shows you details about each generation request including its output:

Genkit DevUI flows

Flow steps
In the last example, you saw that each generate() call showed up as a separate step in the trace viewer. Each of Genkit’s fundamental actions show up as separate steps of a flow:

generate()
Chat.send()
embed()
index()
retrieve()
If you want to include code other than the above in your traces, you can do so by wrapping the code in a run() call. You might do this for calls to third-party libraries that are not Genkit-aware, or for any critical section of code.

For example, here’s a flow with two steps: the first step retrieves a menu using some unspecified method, and the second step includes the menu as context for a generate() call.

export const menuQuestionFlow = ai.defineFlow(
  {
    name: 'menuQuestionFlow',
    inputSchema: z.object({ question: z.string() }),
    outputSchema: z.object({ answer: z.string() }),
  },
  async ({ question }): Promise<{ answer: string }> => {
    const menu = await ai.run('retrieve-daily-menu', async (): Promise<string> => {
      // Retrieve today's menu. (This could be a database access or simply
      // fetching the menu from your website.)

      // ...

      return menu;
    });
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      system: "Help the user answer questions about today's menu.",
      prompt: question,
      docs: [{ content: [{ text: menu }] }],
    });
    return { answer: text };
  },
);

Because the retrieval step is wrapped in a run() call, it’s included as a step in the trace viewer:

Genkit DevUI flows

Deploying flows
You can deploy your flows directly as web API endpoints, ready for you to call from your app clients. Deployment is discussed in detail on several other pages, but this section gives brief overviews of your deployment options.

Cloud Functions for Firebase
To deploy flows with Cloud Functions for Firebase, use the onCallGenkit feature of firebase-functions/https. onCallGenkit wraps your flow in a callable function. You may set an auth policy and configure App Check.

import { hasClaim, onCallGenkit } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('GOOGLE_AI_API_KEY');

const menuSuggestionFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: z.object({ menuItem: z.string() }),
  },
  async ({ theme }) => {
    // ...
    return { menuItem: "Generated menu item would go here" };
  },
);

export const menuSuggestion = onCallGenkit(
  {
    secrets: [apiKey],
    authPolicy: hasClaim('email_verified'),
  },
  menuSuggestionFlow,
);

For more information, see the following pages:

Deploy with Firebase
Authorization and integrity
Firebase plugin
Express.js
To deploy flows using any Node.js hosting platform, such as Cloud Run, define your flows using defineFlow() and then call startFlowServer():

import { startFlowServer } from '@genkit-ai/express';

export const menuSuggestionFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: z.object({ result: z.string() }),
  },
  async ({ theme }) => {
    // ...
  },
);

startFlowServer({
  flows: [menuSuggestionFlow],
});

By default, startFlowServer will serve all the flows defined in your codebase as HTTP endpoints (for example, http://localhost:3400/menuSuggestionFlow). You can call a flow with a POST request as follows:

Terminal window
curl -X POST "http://localhost:3400/menuSuggestionFlow" \
  -H "Content-Type: application/json"  -d '{"data": {"theme": "banana"}}'

If needed, you can customize the flows server to serve a specific list of flows, as shown below. You can also specify a custom port (it will use the PORT environment variable if set) or specify CORS settings.

export const flowA = ai.defineFlow(
  {
    name: 'flowA',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ response: z.string() }),
  },
  async ({ subject }) => {
    // ...
    return { response: "Generated response would go here" };
  }
);

export const flowB = ai.defineFlow(
  {
    name: 'flowB',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ response: z.string() }),
  },
  async ({ subject }) => {
    // ...
    return { response: "Generated response would go here" };
  }
);

startFlowServer({
  flows: [flowB],
  port: 4567,
  cors: {
    origin: '*',
  },
});

Managing prompts with Dotprompt
Prompt engineering is the primary way that you, as an app developer, influence the output of generative AI models. For example, when using LLMs, you can craft prompts that influence the tone, format, length, and other characteristics of the models’ responses.

The way you write these prompts will depend on the model you’re using; a prompt written for one model might not perform well when used with another model. Similarly, the model parameters you set (temperature, top-k, and so on) will also affect output differently depending on the model.

Getting all three of these factors—the model, the model parameters, and the prompt—working together to produce the output you want is rarely a trivial process and often involves substantial iteration and experimentation. Genkit provides a library and file format called Dotprompt, that aims to make this iteration faster and more convenient.

Dotprompt is designed around the premise that prompts are code. You define your prompts along with the models and model parameters they’re intended for separately from your application code. Then, you (or, perhaps someone not even involved with writing application code) can rapidly iterate on the prompts and model parameters using the Genkit Developer UI. Once your prompts are working the way you want, you can import them into your application and run them using Genkit.

Your prompt definitions each go in a file with a .prompt extension. Here’s an example of what these files look like:

---
model: googleai/gemini-2.5-flash
config:
  temperature: 0.9
input:
  schema:
    location: string
    style?: string
    name?: string
  default:
    location: a restaurant
---

You are the world's most welcoming AI assistant and are currently working at {{location}}.

Greet a guest{{#if name}} named {{name}}{{/if}}{{#if style}} in the style of {{style}}{{/if}}.

The portion in the triple-dashes is YAML front matter, similar to the front matter format used by GitHub Markdown and Jekyll; the rest of the file is the prompt, which can optionally use Handlebars templates. The following sections will go into more detail about each of the parts that make a .prompt file and how to use them.

Before you begin
Before reading this page, you should be familiar with the content covered on the Generating content with AI models page.

If you want to run the code examples on this page, first complete the steps in the Get started guide. All of the examples assume that you have already installed Genkit as a dependency in your project.

Creating prompt files
Although Dotprompt provides several different ways to create and load prompts, it’s optimized for projects that organize their prompts as .prompt files within a single directory (or subdirectories thereof). This section shows you how to create and load prompts using this recommended setup.

Creating a prompt directory
The Dotprompt library expects to find your prompts in a directory at your project root and automatically loads any prompts it finds there. By default, this directory is named prompts. For example, using the default directory name, your project structure might look something like this:

your-project/
├── lib/
├── node_modules/
├── prompts/
│   └── hello.prompt
├── src/
├── package-lock.json
├── package.json
└── tsconfig.json

If you want to use a different directory, you can specify it when you configure Genkit:

const ai = genkit({
  promptDir: './llm_prompts',
  // (Other settings...)
});

Creating a prompt file
There are two ways to create a .prompt file: using a text editor, or with the developer UI.

Using a text editor
If you want to create a prompt file using a text editor, create a text file with the .prompt extension in your prompts directory: for example, prompts/hello.prompt.

Here is a minimal example of a prompt file:

---
model: vertexai/gemini-2.5-flash
---
You are the world's most welcoming AI assistant. Greet the user and offer your assistance.

The portion in the dashes is YAML front matter, similar to the front matter format used by GitHub markdown and Jekyll; the rest of the file is the prompt, which can optionally use Handlebars templates. The front matter section is optional, but most prompt files will at least contain metadata specifying a model. The remainder of this page shows you how to go beyond this, and make use of Dotprompt’s features in your prompt files.

Using the developer UI
You can also create a prompt file using the model runner in the developer UI. Start with application code that imports the Genkit library and configures it to use the model plugin you’re interested in. For example:

import { genkit } from 'genkit';

// Import the model plugins you want to use.
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  // Initialize and configure the model plugins.
  plugins: [
    googleAI({
      apiKey: 'your-api-key', // Or (preferred): export GEMINI_API_KEY=...
    }),
  ],
});

It’s okay if the file contains other code, but the above is all that’s required.

Load the developer UI in the same project:

Terminal window
genkit start -- tsx --watch src/your-code.ts

In the Models section, choose the model you want to use from the list of models provided by the plugin.

Genkit Developer UI Model Runner

Then, experiment with the prompt and configuration until you get results you’re happy with. When you’re ready, press the Export button and save the file to your prompts directory.

Running prompts
After you’ve created prompt files, you can run them from your application code, or using the tooling provided by Genkit. Regardless of how you want to run your prompts, first start with application code that imports the Genkit library and the model plugins you’re interested in. For example:

import { genkit } from 'genkit';

// Import the model plugins you want to use.
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  // Initialize and configure the model plugins.
  plugins: [
    googleAI({
      apiKey: 'your-api-key', // Or (preferred): export GEMINI_API_KEY=...
    }),
  ],
});

It’s okay if the file contains other code, but the above is all that’s required. If you’re storing your prompts in a directory other than the default, be sure to specify it when you configure Genkit.

Run prompts from code
To use a prompt, first load it using the prompt('file_name') method:

const helloPrompt = ai.prompt('hello');

Once loaded, you can call the prompt like a function:

const response = await helloPrompt();

// Alternatively, use destructuring assignments to get only the properties
// you're interested in:
const { text } = await helloPrompt();

Or you can also run the prompt in streaming mode:

const { response, stream } = helloPrompt.stream();

for await (const chunk of stream) {
  console.log(chunk.text);
}
// optional final (aggregated) response
console.log((await response).text);

A callable prompt takes two optional parameters: the input to the prompt (see the section below on specifying input schemas), and a configuration object, similar to that of the generate() method. For example:

const response2 = await helloPrompt(
  // Prompt input:
  { name: 'Ted' },

  // Generation options:
  {
    config: {
      temperature: 0.4,
    },
  },
);

Similarly for streaming:

const { stream } = helloPrompt.stream(input, options);

Any parameters you pass to the prompt call will override the same parameters specified in the prompt file.

See Generate content with AI models for descriptions of the available options.

Using the developer UI
As you’re refining your app’s prompts, you can run them in the Genkit developer UI to quickly iterate on prompts and model configurations, independently from your application code.

Load the developer UI from your project directory:

Terminal window
genkit start -- tsx --watch src/your-code.ts

Genkit Developer UI Model Runner

Once you’ve loaded prompts into the developer UI, you can run them with different input values, and experiment with how changes to the prompt wording or the configuration parameters affect the model output. When you’re happy with the result, you can click the Export prompt button to save the modified prompt back into your project directory.

Model configuration
In the front matter block of your prompt files, you can optionally specify model configuration values for your prompt:

---
model: googleai/gemini-2.5-flash
config:
  temperature: 1.4
  topK: 50
  topP: 0.4
  maxOutputTokens: 400
  stopSequences:
    -   "<end>"
    -   "<fin>"
---

These values map directly to the config parameter accepted by the callable prompt:

const response3 = await helloPrompt(
  {},
  {
    config: {
      temperature: 1.4,
      topK: 50,
      topP: 0.4,
      maxOutputTokens: 400,
      stopSequences: ['<end>', '<fin>'],
    },
  },
);

See Generate content with AI models for descriptions of the available options.

Input and output schemas
You can specify input and output schemas for your prompt by defining them in the front matter section:

---
model: googleai/gemini-2.5-flash
input:
  schema:
    theme?: string
  default:
    theme: "pirate"
output:
  schema:
    dishname: string
    description: string
    calories: integer
    allergens(array): string
---
Invent a menu item for a {{theme}} themed restaurant.

These schemas are used in much the same way as those passed to a generate() request or a flow definition. For example, the prompt defined above produces structured output:

const menuPrompt = ai.prompt('menu');
const { output } = await menuPrompt({ theme: 'medieval' });

const dishName = output['dishname'];
const description = output['description'];

You have several options for defining schemas in a .prompt file: Dotprompt’s own schema definition format, Picoschema; standard JSON Schema; or, as references to schemas defined in your application code. The following sections describe each of these options in more detail.

Picoschema
The schemas in the example above are defined in a format called Picoschema. Picoschema is a compact, YAML-optimized schema definition format that makes it easy to define the most important attributes of a schema for LLM usage. Here’s a longer example of a schema, which specifies the information an app might store about an article:

schema:
  title: string # string, number, and boolean types are defined like this
  subtitle?: string # optional fields are marked with a `?`
  draft?: boolean, true when in draft state
  status?(enum, approval status): [PENDING, APPROVED]
  date: string, the date of publication e.g. '2024-04-09' # descriptions follow a comma
  tags(array, relevant tags for article): string # arrays are denoted via parentheses
  authors(array):
    name: string
    email?: string
  metadata?(object): # objects are also denoted via parentheses
    updatedAt?: string, ISO timestamp of last update
    approvedBy?: integer, id of approver
  extra?: any, arbitrary extra data
  (*): string, wildcard field

The above schema is equivalent to the following TypeScript interface:

interface Article {
  title: string;
  subtitle?: string | null;
  /** true when in draft state */
  draft?: boolean | null;
  /** approval status */
  status?: 'PENDING' | 'APPROVED' | null;
  /** the date of publication e.g. '2024-04-09' */
  date: string;
  /** relevant tags for article */
  tags: string[];
  authors: {
    name: string;
    email?: string | null;
  }[];
  metadata?: {
    /** ISO timestamp of last update */
    updatedAt?: string | null;
    /** id of approver */
    approvedBy?: number | null;
  } | null;
  /** arbitrary extra data */
  extra?: any;
  /** wildcard field */
}

Picoschema supports scalar types string, integer, number, boolean, and any. Objects, arrays, and enums are denoted by a parenthetical after the field name.

Objects defined by Picoschema have all properties required unless denoted optional by ?, and do not allow additional properties. When a property is marked as optional, it is also made nullable to provide more leniency for LLMs to return null instead of omitting a field.

In an object definition, the special key (*) can be used to declare a “wildcard” field definition. This will match any additional properties not supplied by an explicit key.

JSON Schema
Picoschema does not support many of the capabilities of full JSON schema. If you require more robust schemas, you may supply a JSON Schema instead:

output:
  schema:
    type: object
    properties:
      field1:
        type: number
        minimum: 20

Zod schemas defined in code
In addition to directly defining schemas in the .prompt file, you can reference a schema registered with defineSchema() by name. If you’re using TypeScript, this approach will let you take advantage of the language’s static type checking features when you work with prompts.

To register a schema:

import { z } from 'genkit';

const MenuItemSchema = ai.defineSchema(
  'MenuItemSchema',
  z.object({
    dishname: z.string(),
    description: z.string(),
    calories: z.coerce.number(),
    allergens: z.array(z.string()),
  }),
);

Within your prompt, provide the name of the registered schema:

---
model: googleai/gemini-2.5-flash-latest
output:
  schema: MenuItemSchema
---

The Dotprompt library will automatically resolve the name to the underlying registered Zod schema. You can then utilize the schema to strongly type the output of a Dotprompt:

const menuPrompt = ai.prompt<
  z.ZodTypeAny, // Input schema
  typeof MenuItemSchema, // Output schema
  z.ZodTypeAny // Custom options schema
>('menu');
const { output } = await menuPrompt({ theme: 'medieval' });

// Now data is strongly typed as MenuItemSchema:
const dishName = output?.dishname;
const description = output?.description;

Prompt templates
The portion of a .prompt file that follows the front matter (if present) is the prompt itself, which will be passed to the model. While this prompt could be a simple text string, very often you will want to incorporate user input into the prompt. To do so, you can specify your prompt using the Handlebars templating language. Prompt templates can include placeholders that refer to the values defined by your prompt’s input schema.

You already saw this in action in the section on input and output schemas:

---
model: googleai/gemini-2.5-flash
input:
  schema:
    theme?: string
  default:
    theme: "pirate"
output:
  schema:
    dishname: string
    description: string
    calories: integer
    allergens(array): string
---
Invent a menu item for a {{theme}} themed restaurant.

In this example, the Handlebars expression, {{theme}}, resolves to the value of the input’s theme property when you run the prompt. To pass input to the prompt, call the prompt as in the following example:

const menuPrompt = ai.prompt('menu');
const { output } = await menuPrompt({ theme: 'medieval' });

Note that because the input schema declared the theme property to be optional and provided a default, you could have omitted the property, and the prompt would have resolved using the default value.

Handlebars templates also support some limited logical constructs. For example, as an alternative to providing a default, you could define the prompt using Handlebars’s #if helper:

---
model: googleai/gemini-2.5-flash
input:
  schema:
    theme?: string
---
Invent a menu item for a {{#if theme}}{{theme}} themed{{/if}} restaurant.

In this example, the prompt renders as “Invent a menu item for a restaurant” when the theme property is unspecified.

See the Handlebars documentation for information on all of the built-in logical helpers.

In addition to properties defined by your input schema, your templates can also refer to values automatically defined by Genkit. The next few sections describe these automatically-defined values and how you can use them.

Multi-message prompts
By default, Dotprompt constructs a single message with a “user” role. However, some prompts are best expressed as a combination of multiple messages, such as a system prompt.

The {{role}} helper provides a simple way to construct multi-message prompts:

---
model: vertexai/gemini-2.5-flash
input:
  schema:
    userQuestion: string
---
{{role "system"}}
You are a helpful AI assistant that really loves to talk about food. Try to work
food items into all of your conversations.
{{role "user"}}
{{userQuestion}}

Note that your final prompt must contain at least one user role.

Multi-modal prompts
For models that support multimodal input, such as images alongside text, you can use the {{media}} helper:

---
model: vertexai/gemini-2.5-flash
input:
  schema:
    photoUrl: string
---
Describe this image in a detailed paragraph:

{{media url=photoUrl}}

The URL can be https: or base64-encoded data: URIs for “inline” image usage. In code, this would be:

const multimodalPrompt = ai.prompt('multimodal');
const { text } = await multimodalPrompt({
  photoUrl: 'https://example.com/photo.jpg',
});

See also Multimodal input, on the Models page, for an example of constructing a data: URL.

Partials
Partials are reusable templates that can be included inside any prompt. Partials can be especially helpful for related prompts that share common behavior.

When loading a prompt directory, any file prefixed with an underscore (_) is considered a partial. So a file _personality.prompt might contain:

You should speak like a {{#if style}}{{style}}{{else}}helpful assistant.{{/if}}.

This can then be included in other prompts:

---
model: googleai/gemini-2.5-flash
input:
  schema:
    name: string
    style?: string
---

{{role "system"}}
{{>personality style=style}}

{{role "user"}}
Give the user a friendly greeting.

User's Name: {{name}}

Partials are inserted using the {{>NAME_OF_PARTIAL args...}} syntax. If no arguments are provided to the partial, it executes with the same context as the parent prompt.

Partials accept both named arguments as above or a single positional argument representing the context. This can be helpful for tasks such as rendering members of a list.

_destination.prompt

- {{name}} ({{country}})

chooseDestination.prompt

---
model: googleai/gemini-2.5-flash
input:
  schema:
    destinations(array):
      name: string
      country: string
---
Help the user decide between these vacation destinations:

{{#each destinations}}
{{>destination this}}
{{/each}}

Defining partials in code
You can also define partials in code using definePartial:

ai.definePartial('personality', 'Talk like a {{#if style}}{{style}}{{else}}helpful assistant{{/if}}.');

Code-defined partials are available in all prompts.

Defining Custom Helpers
You can define custom helpers to process and manage data inside of a prompt. Helpers are registered globally using defineHelper:

ai.defineHelper('shout', (text: string) => text.toUpperCase());

Once a helper is defined you can use it in any prompt:

---
model: googleai/gemini-2.5-flash
input:
  schema:
    name: string
---

HELLO, {{shout name}}!!!

Prompt variants
Because prompt files are just text, you can (and should!) commit them to your version control system, allowing you to compare changes over time easily. Often, tweaked versions of prompts can only be fully tested in a production environment side-by-side with existing versions. Dotprompt supports this through its variants feature.

To create a variant, create a [name].[variant].prompt file. For instance, if you were using Gemini 2.0 Flash in your prompt but wanted to see if Gemini 2.5 Pro would perform better, you might create two files:

my_prompt.prompt: the “baseline” prompt
my_prompt.gemini25pro.prompt: a variant named gemini25pro
To use a prompt variant, specify the variant option when loading:

const myPrompt = ai.prompt('my_prompt', { variant: 'gemini25pro' });

The name of the variant is included in the metadata of generation traces, so you can compare and contrast actual performance between variants in the Genkit trace inspector.

Defining prompts in code
All of the examples discussed so far have assumed that your prompts are defined in individual .prompt files in a single directory (or subdirectories thereof), accessible to your app at runtime. Dotprompt is designed around this setup, and its authors consider it to be the best developer experience overall.

However, if you have use cases that are not well supported by this setup, you can also define prompts in code using the definePrompt() function:

The first parameter to this function is analogous to the front matter block of a .prompt file; the second parameter can either be a Handlebars template string, as in a prompt file, or a function that returns a GenerateRequest:

const myPrompt = ai.definePrompt({
  name: 'myPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {
    schema: z.object({
      name: z.string(),
    }),
  },
  prompt: 'Hello, {{name}}. How are you today?',
});

const myPrompt = ai.definePrompt({
  name: 'myPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {
    schema: z.object({
      name: z.string(),
    }),
  },
  messages: async (input) => {
    return [
      {
        role: 'user',
        content: [{ text: `Hello, ${input.name}. How are you today?` }],
      },
    ];
  },
});

Creating persistent chat sessions
Beta

This feature of Genkit is in Beta, which means it is not yet part of Genkit’s stable API. APIs of beta features may change in minor version releases.

Many of your users will have interacted with large language models for the first time through chatbots. Although LLMs are capable of much more than simulating conversations, it remains a familiar and useful style of interaction. Even when your users will not be interacting directly with the model in this way, the conversational style of prompting is a powerful way to influence the output generated by an AI model.

To support this style of interaction, Genkit provides a set of interfaces and abstractions that make it easier for you to build chat-based LLM applications.

Before you begin
Before reading this page, you should be familiar with the content covered on the Generating content with AI models page.

If you want to run the code examples on this page, first complete the steps in the Getting started guide. All of the examples assume that you have already installed Genkit as a dependency in your project.

Note that the chat API is currently in beta and must be used from the genkit/beta package.

Chat session basics
Genkit by Example: Simple Chatbot
View a live example of a simple chatbot built with Genkit.
Here is a minimal, console-based, chatbot application:

import { genkit } from 'genkit/beta';
import { googleAI } from '@genkit-ai/googleai';

import { createInterface } from 'node:readline/promises';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

async function main() {
  const chat = ai.chat();
  console.log("You're chatting with Gemini. Ctrl-C to quit.\n");
  const readline = createInterface(process.stdin, process.stdout);
  while (true) {
    const userInput = await readline.question('> ');
    const { text } = await chat.send(userInput);
    console.log(text);
  }
}

main();

A chat session with this program looks something like the following example:

You're chatting with Gemini. Ctrl-C to quit.

> hi
Hi there! How can I help you today?

> my name is pavel
Nice to meet you, Pavel! What can I do for you today?

> what's my name?
Your name is Pavel! I remembered it from our previous interaction.

Is there anything else I can help you with?

As you can see from this brief interaction, when you send a message to a chat session, the model can make use of the session so far in its responses. This is possible because Genkit does a few things behind the scenes:

Retrieves the chat history, if any exists, from storage (more on persistence and storage later)
Sends the request to the model, as with generate(), but automatically include the chat history
Saves the model response into the chat history
Model configuration
The chat() method accepts most of the same configuration options as generate(). To pass configuration options to the model:

const chat = ai.chat({
  model: googleAI.model('gemini-2.5-flash'),
  system: "You're a pirate first mate. Address the user as Captain and assist " + 'them however you can.',
  config: {
    temperature: 1.3,
  },
});

Stateful chat sessions
In addition to persisting a chat session’s message history, you can also persist any arbitrary JavaScript object. Doing so can let you manage state in a more structured way then relying only on information in the message history.

To include state in a session, you need to instantiate a session explicitly:

interface MyState {
  userName: string;
}

const session = ai.createSession<MyState>({
  initialState: {
    userName: 'Pavel',
  },
});

You can then start a chat within the session:

const chat = session.chat();

To modify the session state based on how the chat unfolds, define tools and include them with your requests:

const changeUserName = ai.defineTool(
  {
    name: 'changeUserName',
    description: 'can be used to change user name',
    inputSchema: z.object({
      newUserName: z.string(),
    }),
  },
  async (input) => {
    await ai.currentSession<MyState>().updateState({
      userName: input.newUserName,
    });
    return `changed username to ${input.newUserName}`;
  },
);

const chat = session.chat({
  model: googleAI.model('gemini-2.5-flash'),
  tools: [changeUserName],
});
await chat.send('change user name to Kevin');

Multi-thread sessions
A single session can contain multiple chat threads. Each thread has its own message history, but they share a single session state.

const lawyerChat = session.chat('lawyerThread', {
  system: 'talk like a lawyer',
});
const pirateChat = session.chat('pirateThread', {
  system: 'talk like a pirate',
});

Session persistence (EXPERIMENTAL)
When you initialize a new chat or session, it’s configured by default to store the session in memory only. This is adequate when the session needs to persist only for the duration of a single invocation of your program, as in the sample chatbot from the beginning of this page. However, when integrating LLM chat into an application, you will usually deploy your content generation logic as stateless web API endpoints. For persistent chats to work under this setup, you will need to implement some kind of session storage that can persist state across invocations of your endpoints.

To add persistence to a chat session, you need to implement Genkit’s SessionStore interface. Here is an example implementation that saves session state to individual JSON files:

class JsonSessionStore<S = any> implements SessionStore<S> {
  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    try {
      const s = await readFile(`${sessionId}.json`, { encoding: 'utf8' });
      const data = JSON.parse(s);
      return data;
    } catch {
      return undefined;
    }
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    const s = JSON.stringify(sessionData);
    await writeFile(`${sessionId}.json`, s, { encoding: 'utf8' });
  }
}

This implementation is probably not adequate for practical deployments, but it illustrates that a session storage implementation only needs to accomplish two tasks:

Get a session object from storage using its session ID
Save a given session object, indexed by its session ID
Once you’ve implemented the interface for your storage backend, pass an instance of your implementation to the session constructors:

// To create a new session:
const session = ai.createSession({
  store: new JsonSessionStore(),
});

// Save session.id so you can restore the session the next time the
// user makes a request.

// If the user has a session ID saved, load the session instead of creating
// a new one:
const session = await ai.loadSession(sessionId, {
  store: new JsonSessionStore(),
});

Tool calling
Tool calling, also known as function calling, is a structured way to give LLMs the ability to make requests back to the application that called it. You define the tools you want to make available to the model, and the model will make tool requests to your app as necessary to fulfill the prompts you give it.

The use cases of tool calling generally fall into a few themes:

Giving an LLM access to information it wasn’t trained with

Frequently changing information, such as a stock price or the current weather.
Information specific to your app domain, such as product information or user profiles.
Note the overlap with retrieval augmented generation (RAG), which is also a way to let an LLM integrate factual information into its generations. RAG is a heavier solution that is most suited when you have a large amount of information or the information that’s most relevant to a prompt is ambiguous. On the other hand, if retrieving the information the LLM needs is a simple function call or database lookup, tool calling is more appropriate.

Introducing a degree of determinism into an LLM workflow

Performing calculations that the LLM cannot reliably complete itself.
Forcing an LLM to generate verbatim text under certain circumstances, such as when responding to a question about an app’s terms of service.
Performing an action when initiated by an LLM

Turning on and off lights in an LLM-powered home assistant
Reserving table reservations in an LLM-powered restaurant agent
Before you begin
If you want to run the code examples on this page, first complete the steps in the Getting started guide. All of the examples assume that you have already set up a project with Genkit dependencies installed.

This page discusses one of the advanced features of Genkit model abstraction, so before you dive too deeply, you should be familiar with the content on the Generating content with AI models page. You should also be familiar with Genkit’s system for defining input and output schemas, which is discussed on the Flows page.

Overview of tool calling
Genkit by Example: Tool Calling
See how Genkit can enable rich UI for tool calling in a live demo.
At a high level, this is what a typical tool-calling interaction with an LLM looks like:

The calling application prompts the LLM with a request and also includes in the prompt a list of tools the LLM can use to generate a response.
The LLM either generates a complete response or generates a tool call request in a specific format.
If the caller receives a complete response, the request is fulfilled and the interaction ends; but if the caller receives a tool call, it performs whatever logic is appropriate and sends a new request to the LLM containing the original prompt or some variation of it as well as the result of the tool call.
The LLM handles the new prompt as in Step 2.
For this to work, several requirements must be met:

The model must be trained to make tool requests when it’s needed to complete a prompt. Most of the larger models provided through web APIs, such as Gemini and Claude, can do this, but smaller and more specialized models often cannot. Genkit will throw an error if you try to provide tools to a model that doesn’t support it.
The calling application must provide tool definitions to the model in the format it expects.
The calling application must prompt the model to generate tool calling requests in the format the application expects.
Tool calling with Genkit
Genkit provides a single interface for tool calling with models that support it. Each model plugin ensures that the last two of the above criteria are met, and the Genkit instance’s generate() function automatically carries out the tool calling loop described earlier.

Model support
Tool calling support depends on the model, the model API, and the Genkit plugin. Consult the relevant documentation to determine if tool calling is likely to be supported. In addition:

Genkit will throw an error if you try to provide tools to a model that doesn’t support it.
If the plugin exports model references, the info.supports.tools property will indicate if it supports tool calling.
Defining tools
Use the Genkit instance’s defineTool() function to write tool definitions:

import { genkit, z } from 'genkit';
import { googleAI } from '@genkitai/google-ai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const getWeather = ai.defineTool(
  {
    name: 'getWeather',
    description: 'Gets the current weather in a given location',
    inputSchema: z.object({
      location: z.string().describe('The location to get the current weather for'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Here, we would typically make an API call or database query. For this
    // example, we just return a fixed value.
    return `The current weather in ${input.location} is 63°F and sunny.`;
  },
);

The syntax here looks just like the defineFlow() syntax; however, name, description, and inputSchema parameters are required. When writing a tool definition, take special care with the wording and descriptiveness of these parameters. They are vital for the LLM to make effective use of the available tools.

Using tools
Include defined tools in your prompts to generate content.

Generate
definePrompt
Prompt file
Chat
const response = await ai.generate({
  prompt: "What is the weather in Baltimore?",
  tools: [getWeather],
});

Streaming and Tool Calling
When combining tool calling with streaming responses, you will receive toolRequest and toolResponse content parts in the chunks of the stream. For example, the following code:

const { stream } = ai.generateStream({
  prompt: "What is the weather in Baltimore?",
  tools: [getWeather],
});

for await (const chunk of stream) {
  console.log(chunk);
}

Might produce a sequence of chunks similar to:

{index: 0, role: "model", content: [{text: "Okay, I'll check the weather"}]}
{index: 0, role: "model", content: [{text: "for Baltimore."}]}
// toolRequests will be emitted as a single chunk by most models
{index: 0, role: "model", content: [{toolRequest: {name: "getWeather", input: {location: "Baltimore"}}}]}
// when streaming multiple messages, Genkit increments the index and indicates the new role
{index: 1, role: "tool", content: [{toolResponse: {name: "getWeather", output: "Temperature: 68 degrees\nStatus: Cloudy."}}]}
{index: 2, role: "model", content: [{text: "The weather in Baltimore is 68 degrees and cloudy."}]}

You can use these chunks to dynamically construct the full generated message sequence.

Limiting Tool Call Iterations with maxTurns
When working with tools that might trigger multiple sequential calls, you can control resource usage and prevent runaway execution using the maxTurns parameter. This sets a hard limit on how many back-and-forth interactions the model can have with your tools in a single generation cycle.

Why use maxTurns?

Cost Control: Prevents unexpected API usage charges from excessive tool calls
Performance: Ensures responses complete within reasonable timeframes
Safety: Guards against infinite loops in complex tool interactions
Predictability: Makes your application behavior more deterministic
The default value is 5 turns, which works well for most scenarios. Each “turn” represents one complete cycle where the model can make tool calls and receive responses.

Example: Web Research Agent

Consider a research agent that might need to search multiple times to find comprehensive information:

const webSearch = ai.defineTool(
  {
    name: 'webSearch',
    description: 'Search the web for current information',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Simulate web search API call
    return `Search results for "${input.query}": [relevant information here]`;
  },
);

const response = await ai.generate({
  prompt: 'Research the latest developments in quantum computing, including recent breakthroughs, key companies, and future applications.',
  tools: [webSearch],
  maxTurns: 8, // Allow up to 8 research iterations
});

Example: Financial Calculator

Here’s a more complex scenario where an agent might need multiple calculation steps:

const calculator = ai.defineTool(
  {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    inputSchema: z.object({
      expression: z.string().describe('Mathematical expression to evaluate'),
    }),
    outputSchema: z.number(),
  },
  async (input) => {
    // Safe evaluation of mathematical expressions
    return eval(input.expression); // In production, use a safe math parser
  },
);

const stockAnalyzer = ai.defineTool(
  {
    name: 'stockAnalyzer',
    description: 'Get current stock price and basic metrics',
    inputSchema: z.object({
      symbol: z.string().describe('Stock symbol (e.g., AAPL)'),
    }),
    outputSchema: z.object({
      price: z.number(),
      change: z.number(),
      volume: z.number(),
    }),
  },
  async (input) => {
    // Simulate stock API call
    return {
      price: 150.25,
      change: 2.50,
      volume: 45000000
    };
  },
);

Generate
definePrompt
Prompt file
Chat
const response = await ai.generate({
  prompt: 'Calculate the total value of my portfolio: 100 shares of AAPL, 50 shares of GOOGL, and 200 shares of MSFT. Also calculate what percentage each holding represents.',
  tools: [calculator, stockAnalyzer],
  maxTurns: 12, // Multiple stock lookups + calculations needed
});

What happens when maxTurns is reached?

When the limit is hit, Genkit stops the tool-calling loop and returns the model’s current response, even if it was in the middle of using tools. The model will typically provide a partial answer or explain that it couldn’t complete all the requested operations.

Dynamically defining tools at runtime
As most things in Genkit tools need to be predefined during your app’s initialization. This is necessary so that you would be able interact with your tools from the Genkit Dev UI. This is typically the recommended way. However there are scenarios when the tool must be defined dynamically per user request.

You can dynamically define tools using ai.dynamicTool function. It is very similar to ai.defineTool method, however dynamic tools are not tracked by Genkit runtime, so cannot be interacted with from Genkit Dev UI and must be passed to the ai.generate call by reference (for regular tools you can also use a string tool name).

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

ai.defineFlow('weatherFlow', async () => {
  const getWeather = ai.dynamicTool(
    {
      name: 'getWeather',
      description: 'Gets the current weather in a given location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the current weather for'),
      }),
      outputSchema: z.string(),
    },
    async (input) => {
      return `The current weather in ${input.location} is 63°F and sunny.`;
    },
  );

  const { text } = await ai.generate({
    prompt: 'What is the weather in Baltimore?',
    tools: [getWeather],
  });

  return text;
});

When defining dynamic tools, to specify input and output schemas you can either use Zod as shown in the previous example, or you can pass in manually constructed JSON Schema.

const getWeather = ai.dynamicTool(
  {
    name: 'getWeather',
    description: 'Gets the current weather in a given location',
    inputJsonSchema: myInputJsonSchema,
    outputJsonSchema: myOutputJsonSchema,
  },
  async (input) => {
    /* ... */
  },
);

Dynamic tools don’t require the implementation function. If you don’t pass in the function the tool will behave like an interrupt and you can do manual tool call handling:

const getWeather = ai.dynamicTool({
  name: 'getWeather',
  description: 'Gets the current weather in a given location',
  inputJsonSchema: myInputJsonSchema,
  outputJsonSchema: myOutputJsonSchema,
});

Pause the tool loop by using interrupts
By default, Genkit repeatedly calls the LLM until every tool call has been resolved. You can conditionally pause execution in situations where you want to, for example:

Ask the user a question or display UI.
Confirm a potentially risky action with the user.
Request out-of-band approval for an action.
Interrupts are special tools that can halt the loop and return control to your code so that you can handle more advanced scenarios. Visit the interrupts guide to learn how to use them.

Explicitly handling tool calls
If you want full control over this tool-calling loop, for example to apply more complicated logic, set the returnToolRequests parameter to true. Now it’s your responsibility to ensure all of the tool requests are fulfilled:

const getWeather = ai.defineTool(
  {
    // ... tool definition ...
  },
  async ({ location }) => {
    // ... tool implementation ...
  },
);

const generateOptions: GenerateOptions = {
  prompt: "What's the weather like in Baltimore?",
  tools: [getWeather],
  returnToolRequests: true,
};

let llmResponse;
while (true) {
  llmResponse = await ai.generate(generateOptions);
  const toolRequests = llmResponse.toolRequests;
  if (toolRequests.length < 1) {
    break;
  }
  const toolResponses: ToolResponsePart[] = await Promise.all(
    toolRequests.map(async (part) => {
      switch (part.toolRequest.name) {
        case 'specialTool':
          return {
            toolResponse: {
              name: part.toolRequest.name,
              ref: part.toolRequest.ref,
              output: await getWeather(part.toolRequest.input),
            },
          };
        default:
          throw Error('Tool not found');
      }
    }),
  );
  generateOptions.messages = llmResponse.messages;
  generateOptions.prompt = toolResponses;
}

Retrieval-augmented generation (RAG)
Genkit provides abstractions that help you build retrieval-augmented generation (RAG) flows, as well as plugins that provide integrations with related tools.

What is RAG?
Retrieval-augmented generation is a technique used to incorporate external sources of information into an LLM’s responses. It’s important to be able to do so because, while LLMs are typically trained on a broad body of material, practical use of LLMs often requires specific domain knowledge (for example, you might want to use an LLM to answer customers’ questions about your company’s products).

One solution is to fine-tune the model using more specific data. However, this can be expensive both in terms of compute cost and in terms of the effort needed to prepare adequate training data.

In contrast, RAG works by incorporating external data sources into a prompt at the time it’s passed to the model. For example, you could imagine the prompt, “What is Bart’s relationship to Lisa?” might be expanded (“augmented”) by prepending some relevant information, resulting in the prompt, “Homer and Marge’s children are named Bart, Lisa, and Maggie. What is Bart’s relationship to Lisa?”

This approach has several advantages:

It can be more cost-effective because you don’t have to retrain the model.
You can continuously update your data source and the LLM can immediately make use of the updated information.
You now have the potential to cite references in your LLM’s responses.
On the other hand, using RAG naturally means longer prompts, and some LLM API services charge for each input token you send. Ultimately, you must evaluate the cost tradeoffs for your applications.

RAG is a very broad area and there are many different techniques used to achieve the best quality RAG. The core Genkit framework offers three main abstractions to help you do RAG:

Indexers: add documents to an “index”.
Embedders: transforms documents into a vector representation
Retrievers: retrieve documents from an “index”, given a query.
These definitions are broad on purpose because Genkit is un-opinionated about what an “index” is or how exactly documents are retrieved from it. Genkit only provides a Document format and everything else is defined by the retriever or indexer implementation provider.

Indexers
The index is responsible for keeping track of your documents in such a way that you can quickly retrieve relevant documents given a specific query. This is most often accomplished using a vector database, which indexes your documents using multidimensional vectors called embeddings. A text embedding (opaquely) represents the concepts expressed by a passage of text; these are generated using special-purpose ML models. By indexing text using its embedding, a vector database is able to cluster conceptually related text and retrieve documents related to a novel string of text (the query).

Before you can retrieve documents for the purpose of generation, you need to ingest them into your document index. A typical ingestion flow does the following:

Split up large documents into smaller documents so that only relevant portions are used to augment your prompts – “chunking”. This is necessary because many LLMs have a limited context window, making it impractical to include entire documents with a prompt.

Genkit doesn’t provide built-in chunking libraries; however, there are open source libraries available that are compatible with Genkit.

Generate embeddings for each chunk. Depending on the database you’re using, you might explicitly do this with an embedding generation model, or you might use the embedding generator provided by the database.

Add the text chunk and its index to the database.

You might run your ingestion flow infrequently or only once if you are working with a stable source of data. On the other hand, if you are working with data that frequently changes, you might continuously run the ingestion flow (for example, in a Cloud Firestore trigger, whenever a document is updated).

Embedders
An embedder is a function that takes content (text, images, audio, etc.) and creates a numeric vector that encodes the semantic meaning of the original content. As mentioned above, embedders are leveraged as part of the process of indexing, however, they can also be used independently to create embeddings without an index.

Retrievers
A retriever is a concept that encapsulates logic related to any kind of document retrieval. The most popular retrieval cases typically include retrieval from vector stores, however, in Genkit a retriever can be any function that returns data.

To create a retriever, you can use one of the provided implementations or create your own.

Supported indexers, retrievers, and embedders
Genkit provides indexer and retriever support through its plugin system. The following plugins are officially supported:

Astra DB - DataStax Astra DB vector database
Chroma DB vector database
Cloud Firestore vector store
Cloud SQL for PostgreSQL with pgvector extension
LanceDB open-source vector database
Neo4j graph database with vector search
Pinecone cloud vector database
Vertex AI Vector Search
In addition, Genkit supports the following vector stores through predefined code templates, which you can customize for your database configuration and schema:

PostgreSQL with pgvector
Defining a RAG Flow
The following examples show how you could ingest a collection of restaurant menu PDF documents into a vector database and retrieve them for use in a flow that determines what food items are available.

Install dependencies for processing PDFs
Terminal window
npm install llm-chunk pdf-parse @genkit-ai/dev-local-vectorstore

npm install --save-dev @types/pdf-parse

Add a local vector store to your configuration
import { devLocalIndexerRef, devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';
import { googleAI } from '@genkit-ai/googleai';
import { z, genkit } from 'genkit';

const ai = genkit({
  plugins: [
    // googleAI provides the gemini-embedding-001 embedder
    googleAI(),

    // the local vector store requires an embedder to translate from text to vector
    devLocalVectorstore([
      {
        indexName: 'menuQA',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
    ]),
  ],
});

Define an Indexer
The following example shows how to create an indexer to ingest a collection of PDF documents and store them in a local vector database.

It uses the local file-based vector similarity retriever that Genkit provides out-of-the-box for simple testing and prototyping (do not use in production)

Create the indexer
export const menuPdfIndexer = devLocalIndexerRef('menuQA');

Create chunking config
This example uses the llm-chunk library which provides a simple text splitter to break up documents into segments that can be vectorized.

The following definition configures the chunking function to guarantee a document segment of between 1000 and 2000 characters, broken at the end of a sentence, with an overlap between chunks of 100 characters.

const chunkingConfig = {
  minLength: 1000,
  maxLength: 2000,
  splitter: 'sentence',
  overlap: 100,
  delimiters: '',
} as any;

More chunking options for this library can be found in the llm-chunk documentation.

Define your indexer flow
import { Document } from 'genkit/retriever';
import { chunk } from 'llm-chunk';
import { readFile } from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

async function extractTextFromPdf(filePath: string) {
  const pdfFile = path.resolve(filePath);
  const dataBuffer = await readFile(pdfFile);
  const data = await pdf(dataBuffer);
  return data.text;
}

export const indexMenu = ai.defineFlow(
  {
    name: 'indexMenu',
    inputSchema: z.object({ filePath: z.string().describe('PDF file path') }),
    outputSchema: z.object({
      success: z.boolean(),
      documentsIndexed: z.number(),
      error: z.string().optional(),
    }),
  },
  async ({ filePath }) => {
    try {
      filePath = path.resolve(filePath);

      // Read the pdf
      const pdfTxt = await ai.run('extract-text', () => extractTextFromPdf(filePath));

      // Divide the pdf text into segments
      const chunks = await ai.run('chunk-it', async () => chunk(pdfTxt, chunkingConfig));

      // Convert chunks of text into documents to store in the index.
      const documents = chunks.map((text) => {
        return Document.fromText(text, { filePath });
      });

      // Add documents to the index
      await ai.index({
        indexer: menuPdfIndexer,
        documents,
      });

      return {
        success: true,
        documentsIndexed: documents.length,
      };
    } catch (err) {
      // For unexpected errors that throw exceptions
      return {
        success: false,
        documentsIndexed: 0,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  },
);

Run the indexer flow
Terminal window
genkit flow:run indexMenu '{"filePath": "menu.pdf"}'

After running the indexMenu flow, the vector database will be seeded with documents and ready to be used in Genkit flows with retrieval steps.

Define a flow with retrieval
The following example shows how you might use a retriever in a RAG flow. Like the indexer example, this example uses Genkit’s file-based vector retriever, which you should not use in production.

import { devLocalRetrieverRef } from '@genkit-ai/dev-local-vectorstore';
import { googleAI } from '@genkit-ai/googleai';

// Define the retriever reference
export const menuRetriever = devLocalRetrieverRef('menuQA');

export const menuQAFlow = ai.defineFlow(
  {
    name: 'menuQA',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ answer: z.string() })
  },
  async ({ query }) => {
    // retrieve relevant documents
    const docs = await ai.retrieve({
      retriever: menuRetriever,
      query,
      options: { k: 3 },
    });

    // generate a response
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `
You are acting as a helpful AI assistant that can answer
questions about the food available on the menu at Genkit Grub Pub.

Use only the context provided to answer the question.
If you don't know, do not make up an answer.
Do not add or change items on the menu.

Question: ${query}`,
      docs,
    });

    return { answer: text };
  },
);

Run the retriever flow
Terminal window
genkit flow:run menuQA '{"query": "Recommend a dessert from the menu while avoiding dairy and nuts"}'

The output for this command should contain a response from the model, grounded in the indexed menu.pdf file.

Write your own indexers and retrievers
It’s also possible to create your own retriever. This is useful if your documents are managed in a document store that is not supported in Genkit (eg: MySQL, Google Drive, etc.). The Genkit SDK provides flexible methods that let you provide custom code for fetching documents. You can also define custom retrievers that build on top of existing retrievers in Genkit and apply advanced RAG techniques (such as reranking or prompt extensions) on top.

Simple Retrievers
Simple retrievers let you easily convert existing code into retrievers:

import { z } from 'genkit';
import { searchEmails } from './db';

ai.defineSimpleRetriever(
  {
    name: 'myDatabase',
    configSchema: z
      .object({
        limit: z.number().optional(),
      })
      .optional(),
    // we'll extract "message" from the returned email item
    content: 'message',
    // and several keys to use as metadata
    metadata: ['from', 'to', 'subject'],
  },
  async (query, config) => {
    const result = await searchEmails(query.text, { limit: config.limit });
    return result.data.emails;
  },
);

Custom Retrievers
import { CommonRetrieverOptionsSchema } from 'genkit/retriever';
import { z } from 'genkit';

export const menuRetriever = devLocalRetrieverRef('menuQA');

const advancedMenuRetrieverOptionsSchema = CommonRetrieverOptionsSchema.extend({
  preRerankK: z.number().max(1000),
});

const advancedMenuRetriever = ai.defineRetriever(
  {
    name: `custom/advancedMenuRetriever`,
    configSchema: advancedMenuRetrieverOptionsSchema,
  },
  async (input, options) => {
    const extendedPrompt = await extendPrompt(input);
    const docs = await ai.retrieve({
      retriever: menuRetriever,
      query: extendedPrompt,
      options: { k: options.preRerankK || 10 },
    });
    const rerankedDocs = await rerank(docs);
    return rerankedDocs.slice(0, options.k || 3);
  },
);

(extendPrompt and rerank is something you would have to implement yourself, not provided by the framework)

And then you can just swap out your retriever:

const docs = await ai.retrieve({
  retriever: advancedRetriever,
  query: input,
  options: { preRerankK: 7, k: 3 },
});

Rerankers and Two-Stage Retrieval
A reranking model — also known as a cross-encoder — is a type of model that, given a query and document, will output a similarity score. We use this score to reorder the documents by relevance to our query. Reranker APIs take a list of documents (for example the output of a retriever) and reorders the documents based on their relevance to the query. This step can be useful for fine-tuning the results and ensuring that the most pertinent information is used in the prompt provided to a generative model.

Reranker Example
A reranker in Genkit is defined in a similar syntax to retrievers and indexers. Here is an example using a reranker in Genkit. This flow reranks a set of documents based on their relevance to the provided query using a predefined Vertex AI reranker.

const FAKE_DOCUMENT_CONTENT = [
  'pythagorean theorem',
  'e=mc^2',
  'pi',
  'dinosaurs',
  'quantum mechanics',
  'pizza',
  'harry potter',
];

export const rerankFlow = ai.defineFlow(
  {
    name: 'rerankFlow',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.array(
      z.object({
        text: z.string(),
        score: z.number(),
      }),
    ),
  },
  async ({ query }) => {
    const documents = FAKE_DOCUMENT_CONTENT.map((text) => ({ content: text }));

    const rerankedDocuments = await ai.rerank({
      reranker: 'vertexai/semantic-ranker-512',
      query: { content: query },
      documents,
    });

    return rerankedDocuments.map((doc) => ({
      text: doc.content,
      score: doc.metadata.score,
    }));
  },
);

This reranker uses the Vertex AI genkit plugin with semantic-ranker-512 to score and rank documents. The higher the score, the more relevant the document is to the query.

Custom Rerankers
You can also define custom rerankers to suit your specific use case. This is helpful when you need to rerank documents using your own custom logic or a custom model. Here’s a simple example of defining a custom reranker:

export const customReranker = ai.defineReranker(
  {
    name: 'custom/reranker',
    configSchema: z.object({
      k: z.number().optional(),
    }),
  },
  async (query, documents, options) => {
    // Your custom reranking logic here
    const rerankedDocs = documents.map((doc) => {
      const score = Math.random(); // Assign random scores for demonstration
      return {
        ...doc,
        metadata: { ...doc.metadata, score },
      };
    });

    return rerankedDocs.sort((a, b) => b.metadata.score - a.metadata.score).slice(0, options.k || 3);
  },
);

Once defined, this custom reranker can be used just like any other reranker in your RAG flows, giving you flexibility to implement advanced reranking strategies.

Evaluation
Evaluation is a form of testing that helps you validate your LLM’s responses and ensure they meet your quality bar.

Genkit supports third-party evaluation tools through plugins, paired with powerful observability features that provide insight into the runtime state of your LLM-powered applications. Genkit tooling helps you automatically extract data including inputs, outputs, and information from intermediate steps to evaluate the end-to-end quality of LLM responses as well as understand the performance of your system’s building blocks.

Types of evaluation
Genkit supports two types of evaluation:

Inference-based evaluation: This type of evaluation runs against a collection of pre-determined inputs, assessing the corresponding outputs for quality.

This is the most common evaluation type, suitable for most use cases. This approach tests a system’s actual output for each evaluation run.

You can perform the quality assessment manually, by visually inspecting the results. Alternatively, you can automate the assessment by using an evaluation metric.

Raw evaluation: This type of evaluation directly assesses the quality of inputs without any inference. This approach typically is used with automated evaluation using metrics. All required fields for evaluation (e.g., input, context, output and reference) must be present in the input dataset. This is useful when you have data coming from an external source (e.g., collected from your production traces) and you want to have an objective measurement of the quality of the collected data.

For more information, see the Advanced use section of this page.

This section explains how to perform inference-based evaluation using Genkit.

Quick start
Setup
Use an existing Genkit app or create a new one by following our Get started guide.

Add the following code to define a simple RAG application to evaluate. For this guide, we use a dummy retriever that always returns the same documents.

import { genkit, z, Document } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit
export const ai = genkit({ plugins: [googleAI()] });

// Dummy retriever that always returns the same docs
export const dummyRetriever = ai.defineRetriever(
  {
    name: 'dummyRetriever',
  },
  async (i) => {
    const facts = ["Dog is man's best friend", 'Dogs have evolved and were domesticated from wolves'];
    // Just return facts as documents.
    return { documents: facts.map((t) => Document.fromText(t)) };
  },
);

// A simple question-answering flow
export const qaFlow = ai.defineFlow(
  {
    name: 'qaFlow',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ answer: z.string() }),
  },
  async ({ query }) => {
    const factDocs = await ai.retrieve({
      retriever: dummyRetriever,
      query,
    });

    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Answer this question with the given context ${query}`,
      docs: factDocs,
    });
    return { answer: text };
  },
);

(Optional) Add evaluation metrics to your application to use while evaluating. This guide uses the MALICIOUSNESS metric from the genkitEval plugin.

import { genkitEval, GenkitMetric } from '@genkit-ai/evaluator';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    ...// Add this plugin to your Genkit initialization block
    genkitEval({
      judge: googleAI.model('gemini-2.5-flash'),
      metrics: [GenkitMetric.MALICIOUSNESS],
    }),
  ],
});

Note: The configuration above requires installation of the @genkit-ai/evaluator package.

Terminal window
npm install @genkit-ai/evaluator

Start your Genkit application.

Terminal window
genkit start -- <command to start your app>

Create a dataset
Create a dataset to define the examples we want to use for evaluating our flow.

Go to the Dev UI at http://localhost:4000 and click the Datasets button to open the Datasets page.

Click on the Create Dataset button to open the create dataset dialog.

a. Provide a datasetId for your new dataset. This guide uses myFactsQaDataset.

b. Select Flow dataset type.

c. Leave the validation target field empty and click Save

Your new dataset page appears, showing an empty dataset. Add examples to it by following these steps:

a. Click the Add example button to open the example editor panel.

b. Only the input field is required. Enter {"query": "Who is man's best friend?"} in the input field, and click Save to add the example has to your dataset.

c. Repeat steps (a) and (b) a couple more times to add more examples. This guide adds the following example inputs to the dataset:

{"query": "Can I give milk to my cats?"}
{"query": "From which animals did dogs evolve?"}

By the end of this step, your dataset should have 3 examples in it, with the values mentioned above.

Run evaluation and view results
To start evaluating the flow, click the Run new evaluation button on your dataset page. You can also start a new evaluation from the Evaluations tab.

Select the Flow radio button to evaluate a flow.

Select qaFlow as the target flow to evaluate.

Select myFactsQaDataset as the target dataset to use for evaluation.

(Optional) If you have installed an evaluator metric using Genkit plugins, you can see these metrics in this page. Select the metrics that you want to use with this evaluation run. This is entirely optional: Omitting this step will still return the results in the evaluation run, but without any associated metrics.

Finally, click Run evaluation to start evaluation. Depending on the flow you’re testing, this may take a while. Once the evaluation is complete, a success message appears with a link to view the results. Click on the link to go to the Evaluation details page.

You can see the details of your evaluation on this page, including original input, extracted context and metrics (if any).

Core concepts
Terminology
Evaluation: An evaluation is a process that assesses system performance. In Genkit, such a system is usually a Genkit primitive, such as a flow or a model. An evaluation can be automated or manual (human evaluation).

Bulk inference Inference is the act of running an input on a flow or model to get the corresponding output. Bulk inference involves performing inference on multiple inputs simultaneously.

Metric An evaluation metric is a criterion on which an inference is scored. Examples include accuracy, faithfulness, maliciousness, whether the output is in English, etc.

Dataset A dataset is a collection of examples to use for inference-based
evaluation. A dataset typically consists of input and optional reference fields. The reference field does not affect the inference step of evaluation but it is passed verbatim to any evaluation metrics. In Genkit, you can create a dataset through the Dev UI. There are two types of datasets in Genkit: Flow datasets and Model datasets.

Schema validation
Depending on the type, datasets have schema validation support in the Dev UI:

Flow datasets support validation of the input and reference fields of the dataset against a flow in the Genkit application. Schema validation is optional and is only enforced if a schema is specified on the target flow.

Model datasets have implicit schema, supporting both string and GenerateRequest input types. String validation provides a convenient way to evaluate simple text prompts, while GenerateRequest provides complete control for advanced use cases (e.g. providing model parameters, message history, tools, etc). You can find the full schema for GenerateRequest in our API reference docs.

Note: Schema validation is a helper tool for editing examples, but it is possible to save an example with invalid schema. These examples may fail when the running an evaluation.

Supported evaluators
Genkit evaluators
Genkit includes a small number of native evaluators, inspired by RAGAS, to help you get started:

Faithfulness — Measures the factual consistency of the generated answer against the given context
Answer Relevancy — Assesses how pertinent the generated answer is to the given prompt
Maliciousness — Measures whether the generated output intends to deceive, harm, or exploit
Evaluator plugins
Genkit supports additional evaluators through plugins, like the Vertex Rapid Evaluators, which you can access via the VertexAI Plugin.

Advanced use
Evaluation comparison
The Developer UI offers visual tools for side-by-side comparison of multiple evaluation runs. This feature allows you to analyze variations across different executions within a unified interface, making it easier to assess changes in output quality. Additionally, you can highlight outputs based on the performance of specific metrics, indicating improvements or regressions.

When comparing evaluations, one run is designated as the Baseline. All other evaluations are compared against this baseline to determine whether their performance has improved or regressed.

Evaluation comparison with metric highlighting
Prerequisites
To use the evaluation comparison feature, the following conditions must be met:

Evaluations must originate from a dataset source. Evaluations from file sources are not comparable.
All evaluations being compared must be from the same dataset.
For metric highlighting, all evaluations must use at least one common metric that produces a number or boolean score.
Comparing evaluations
Ensure you have at least two evaluation runs performed on the same dataset. For instructions, refer to the Run evaluation section.

In the Developer UI, navigate to the Datasets page.

Select the relevant dataset and open its Evaluations tab. You should see all evaluation runs associated with that dataset.

Choose one evaluation to serve as the baseline for comparison.

On the evaluation results page, click the + Comparison button. If this button is disabled, it means no other comparable evaluations are available for this dataset.

A new column will appear with a dropdown menu. Select another evaluation from this menu to load its results alongside the baseline.

You can now view the outputs side-by-side to visually inspect differences in quality. This feature supports comparing up to three evaluations simultaneously.

Metric highlighting (Optional)
If your evaluations include metrics, you can enable metric highlighting to color-code the results. This feature helps you quickly identify changes in performance: improvements are colored green, while regressions are red.

Note that highlighting is only supported for numeric and boolean metrics, and the selected metric must be present in all evaluations being compared.

To enable metric highlighting:

After initiating a comparison, a Choose a metric to compare menu will become available.

Select a metric from the dropdown. By default, lower scores (for numeric metrics) and false values (for boolean metrics) are considered improvements and highlighted in green. You can reverse this logic by ticking the checkbox in the menu.

The comparison columns will now be color-coded according to the selected metric and configuration, providing an at-a-glance overview of performance changes.

Evaluation using the CLI
Genkit CLI provides a rich API for performing evaluation. This is especially useful in environments where the Dev UI is not available (e.g. in a CI/CD workflow).

Genkit CLI provides 3 main evaluation commands: eval:flow, eval:extractData, and eval:run.

eval:flow command
The eval:flow command runs inference-based evaluation on an input dataset. This dataset may be provided either as a JSON file or by referencing an existing dataset in your Genkit runtime.

Terminal window
# Referencing an existing dataset
genkit eval:flow qaFlow --input myFactsQaDataset

# or, using a dataset from a file
genkit eval:flow qaFlow --input testInputs.json

Note: Make sure that you start your genkit app before running these CLI commands.

Terminal window
genkit start -- <command to start your app>

Here, testInputs.json should be an array of objects containing an input field and an optional reference field, like below:

[
  {
    "input": { "query": "What is the French word for Cheese?" }
  },
  {
    "input": { "query": "What green vegetable looks like cauliflower?" },
    "reference": "Broccoli"
  }
]

If your flow requires auth, you may specify it using the --context argument:

Terminal window
genkit eval:flow qaFlow --input testInputs.json --context '{"auth": {"email_verified": true}}'

By default, the eval:flow and eval:run commands use all available metrics for evaluation. To run on a subset of the configured evaluators, use the --evaluators flag and provide a comma-separated list of evaluators by name:

Terminal window
genkit eval:flow qaFlow --input testInputs.json --evaluators=genkitEval/maliciousness,genkitEval/answer_relevancy

You can view the results of your evaluation run in the Dev UI at localhost:4000/evaluate.

eval:extractData and eval:run commands
To support raw evaluation, Genkit provides tools to extract data from traces and run evaluation metrics on extracted data. This is useful, for example, if you are using a different framework for evaluation or if you are collecting inferences from a different environment to test locally for output quality.

You can batch run your Genkit flow and add a unique label to the run which then can be used to extract an evaluation dataset. A raw evaluation dataset is a collection of inputs for evaluation metrics, without running any prior inference.

Run your flow over your test inputs:

Terminal window
genkit flow:batchRun qaFlow testInputs.json --label firstRunSimple

Extract the evaluation data:

Terminal window
genkit eval:extractData qaFlow --label firstRunSimple --output factsEvalDataset.json

The exported data has a format different from the dataset format presented earlier. This is because this data is intended to be used with evaluation metrics directly, without any inference step. Here is the syntax of the extracted data.

Array<{
  "testCaseId": string,
  "input": any,
  "output": any,
  "context": any[],
  "traceIds": string[],
}>;

The data extractor automatically locates retrievers and adds the produced docs to the context array. You can run evaluation metrics on this extracted dataset using the eval:run command.

Terminal window
genkit eval:run factsEvalDataset.json

By default, eval:run runs against all configured evaluators, and as with eval:flow, results for eval:run appear in the evaluation page of Developer UI, located at localhost:4000/evaluate.

Batching evaluations
Note

This feature is only available in the Node.js SDK.

You can speed up evaluations by processing the inputs in batches using the CLI and Dev UI. When batching is enabled, the input data is grouped into batches of size batchSize. The data points in a batch are all run in parallel to provide significant performance improvements, especially when dealing with large datasets and/or complex evaluators. By default (when the flag is omitted), batching is disabled.

The batchSize option has been integrated into the eval:flow and eval:run CLI commands. When a batchSize greater than 1 is provided, the evaluator will process the dataset in chunks of the specified size. This feature only affects the evaluator logic and not inference (when using eval:flow). Here are some examples of enabling batching with the CLI:

Terminal window
genkit eval:flow myFlow --input yourDataset.json --evaluators=custom/myEval --batchSize 10

Or, with eval:run

Terminal window
genkit eval:run yourDataset.json --evaluators=custom/myEval --batchSize 10

Batching is also available in the Dev UI for Genkit (JS) applications. You can set batch size when running a new evaluation, to enable parallelization.

Custom extractors
Genkit provides reasonable default logic for extracting the necessary fields (input, output and context) while doing an evaluation. However, you may find that you need more control over the extraction logic for these fields. Genkit supports customs extractors to achieve this. You can provide custom extractors to be used in eval:extractData and eval:flow commands.

First, as a preparatory step, introduce an auxilary step in our qaFlow example:

export const qaFlow = ai.defineFlow(
  {
    name: 'qaFlow',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ answer: z.string() }),
  },
  async ({ query }) => {
    const factDocs = await ai.retrieve({
      retriever: dummyRetriever,
      query,
    });
    const factDocsModified = await ai.run('factModified', async () => {
      // Let us use only facts that are considered silly. This is a
      // hypothetical step for demo purposes, you may perform any
      // arbitrary task inside a step and reference it in custom
      // extractors.
      //
      // Assume you have a method that checks if a fact is silly
      return factDocs.filter((d) => isSillyFact(d.text));
    });

    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Answer this question with the given context ${query}`,
      docs: factDocsModified,
    });
    return { answer: text };
  },
);

Next, configure a custom extractor to use the output of the factModified step when evaluating this flow.

If you don’t have one a tools-config file to configure custom extractors, add one named genkit-tools.conf.js to your project root.

Terminal window
cd /path/to/your/genkit/app

touch genkit-tools.conf.js

In the tools config file, add the following code:

module.exports = {
  evaluators: [
    {
      actionRef: '/flow/qaFlow',
      extractors: {
        context: { outputOf: 'factModified' },
      },
    },
  ],
};

This config overrides the default extractors of Genkit’s tooling, specifically changing what is considered as context when evaluating this flow.

Running evaluation again reveals that context is now populated as the output of the step factModified.

Terminal window
genkit eval:flow qaFlow --input testInputs.json

Evaluation extractors are specified as follows:

evaluators field accepts an array of EvaluatorConfig objects, which are scoped by flowName
extractors is an object that specifies the extractor overrides. The current supported keys in extractors are [input, output, context]. The acceptable value types are:
string - this should be a step name, specified as a string. The output of this step is extracted for this key.
{ inputOf: string } or { outputOf: string } - These objects represent specific channels (input or output) of a step. For example, { inputOf: 'foo-step' } would extract the input of step foo-step for this key.
(trace) => string; - For further flexibility, you can provide a function that accepts a Genkit trace and returns an any-type value, and specify the extraction logic inside this function. Refer to genkit/genkit-tools/common/src/types/trace.ts for the exact TraceData schema.
Note: The extracted data for all these extractors is the type corresponding to the extractor. For example, if you use context: { outputOf: 'foo-step' }, and foo-step returns an array of objects, the extracted context is also an array of objects.

Synthesizing test data using an LLM
Here is an example flow that uses a PDF file to generate potential user questions.

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { chunk } from 'llm-chunk'; // npm install llm-chunk
import path from 'path';
import { readFile } from 'fs/promises';
import pdf from 'pdf-parse'; // npm install pdf-parse

const ai = genkit({ plugins: [googleAI()] });

const chunkingConfig = {
  minLength: 1000, // number of minimum characters into chunk
  maxLength: 2000, // number of maximum characters into chunk
  splitter: 'sentence', // paragraph | sentence
  overlap: 100, // number of overlap chracters
  delimiters: '', // regex for base split method
} as any;

async function extractText(filePath: string) {
  const pdfFile = path.resolve(filePath);
  const dataBuffer = await readFile(pdfFile);
  const data = await pdf(dataBuffer);
  return data.text;
}

export const synthesizeQuestions = ai.defineFlow(
  {
    name: 'synthesizeQuestions',
    inputSchema: z.object({ filePath: z.string().describe('PDF file path') }),
    outputSchema: z.object({
      questions: z.array(
        z.object({
          query: z.string(),
        }),
      ),
    }),
  },
  async ({ filePath }) => {
    filePath = path.resolve(filePath);
    // `extractText` loads the PDF and extracts its contents as text.
    const pdfTxt = await ai.run('extract-text', () => extractText(filePath));

    const chunks = await ai.run('chunk-it', async () => chunk(pdfTxt, chunkingConfig));

    const questions = [];
    for (var i = 0; i < chunks.length; i++) {
      const { text } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt: {
          text: `Generate one question about the following text: ${chunks[i]}`,
        },
      });
      questions.push({ query: text });
    }
    return { questions };
  },
);

You can then use this command to export the data into a file and use for evaluation.

Terminal window
genkit flow:run synthesizeQuestions '{"filePath": "my_input.pdf"}' --output synthesizedQuestions.json


Error Types
Genkit knows about two specialized types: GenkitError and UserFacingError. GenkitError is intended for use by Genkit itself or Genkit plugins. UserFacingError is intended for ContextProviders and your code. The separation between these two error types helps you better understand where your error is coming from.

Genkit plugins for web hosting (e.g. @genkit-ai/express or @genkit-ai/next) SHOULD capture all other Error types and instead report them as an internal error in the response. This adds a layer of security to your application by ensuring that internal details of your application do not leak to attackers.

Deploy flows using Cloud Functions for Firebase
Cloud Functions for Firebase has an onCallGenkit method that lets you quickly create a callable function with a Genkit action (e.g. a Flow). These functions can be called using genkit/beta/clientor the Functions client SDK, which automatically adds auth info.

Before you begin
You should be familiar with Genkit’s concept of flows, and how to write them. The instructions on this page assume that you already have some flows defined, which you want to deploy.
It would be helpful, but not required, if you’ve already used Cloud Functions for Firebase before.
1. Set up a Firebase project
If you don’t already have a Firebase project with TypeScript Cloud Functions set up, follow these steps:

Create a new Firebase project using the Firebase console or choose an existing one.

Upgrade the project to the Blaze plan, which is required to deploy Cloud Functions.

Install the Firebase CLI.

Log in with the Firebase CLI:

Terminal window
firebase login

firebase login --reauth # alternative, if necessary

firebase login --no-localhost # if running in a remote shell

Create a new project directory:

Terminal window
export PROJECT_ROOT=~/tmp/genkit-firebase-project1

mkdir -p $PROJECT_ROOT

Initialize a Firebase project in the directory:

Terminal window
cd $PROJECT_ROOT

firebase init genkit

The rest of this page assumes that you’ve decided to write your functions in TypeScript, but you can also deploy your Genkit flows if you’re using JavaScript.

2. Wrap the Flow in onCallGenkit
After you’ve set up a Firebase project with Cloud Functions, you can copy or write flow definitions in the project’s functions/src directory, and export them in index.ts.

For your flows to be deployable, you need to wrap them in onCallGenkit. This method has all the features of the normal onCall. It automatically supports both streaming and JSON responses.

Suppose you have the following flow:

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

You can expose this flow as a callable function using onCallGenkit:

import { onCallGenkit } from 'firebase-functions/https';

export generatePoem = onCallGenkit(generatePoemFlow);

Define an authorization policy
All deployed flows, whether deployed to Firebase or not, should have an authorization policy; without one, anyone can invoke your potentially-expensive generative AI flows. To define an authorization policy, use the authPolicy parameter of onCallGenkit:

export const generatePoem = onCallGenkit(
  {
    authPolicy: (auth) => auth?.token?.email_verified,
  },
  generatePoemFlow,
);

This sample uses a manual function as its auth policy. In addition, the https library exports the signedIn() and hasClaim() helpers. Here is the same code using one of those helpers:

import { hasClaim } from 'firebase-functions/https';

export const generatePoem = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
  },
  generatePoemFlow,
);

Make API credentials available to deployed flows
Once deployed, your flows need some way to authenticate with any remote services they rely on. Most flows need, at a minimum, credentials for accessing the model API service they use.

For this example, do one of the following, depending on the model provider you chose:

Gemini (Google AI)
Gemini (Vertex AI)
Make sure Google AI is available in your region.

Generate an API key for the Gemini API using Google AI Studio.

Store your API key in Cloud Secret Manager:

Terminal window
firebase functions:secrets:set GEMINI_API_KEY

This step is important to prevent accidentally leaking your API key, which grants access to a potentially metered service.

See Store and access sensitive configuration information for more information on managing secrets.

Edit src/index.ts and add the following after the existing imports:

import { defineSecret } from "firebase-functions/params";
const googleAIapiKey = defineSecret("GEMINI_API_KEY");

Then, in the flow definition, declare that the cloud function needs access to this secret value:

export const generatePoem = onCallGenkit(
  {
    secrets: [googleAIapiKey],
  },
  generatePoemFlow
);

Now, when you deploy this function, your API key is stored in Cloud Secret Manager, and available from the Cloud Functions environment.

The only secret you need to set up for this tutorial is for the model provider, but in general, you must do something similar for each service your flow uses.

Add App Check enforcement
Firebase App Check uses a built-in attestation mechanism to verify that your API is only being called by your application. onCallGenkit supports App Check enforcement declaratively.

export const generatePoem = onCallGenkit(
  {
    enforceAppCheck: true,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: true,
  },
  generatePoemFlow,
);

Set a CORS policy
Callable functions default to allowing any domain to call your function. If you want to customize the domains that can do this, use the cors option. With proper authentication (especially App Check), CORS is often unnecessary.

export const generatePoem = onCallGenkit(
  {
    cors: 'mydomain.com',
  },
  generatePoemFlow,
);

Complete example
After you’ve made all of the changes described earlier, your deployable flow looks something like the following example:

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

export const generatePoem = onCallGenkit(
  {
    secrets: [apiKey],
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  generatePoemFlow,
);

3. Deploy flows to Firebase
After you’ve defined flows using onCallGenkit, you can deploy them the same way you would deploy other Cloud Functions:

Terminal window
cd $PROJECT_ROOT

firebase deploy --only functions

You’ve now deployed the flow as a Cloud Function! But you can’t access your deployed endpoint with curl or similar, because of the flow’s authorization policy. The next section explains how to securely access the flow.

Optional: Try the deployed flow
To try out your flow endpoint, you can deploy the following minimal example web app:

In the Project settings section of the Firebase console, add a new web app, selecting the option to also set up Hosting.

In the Authentication section of the Firebase console, enable the Google provider, used in this example.

In your project directory, set up Firebase Hosting, where you will deploy the sample app:

Terminal window
cd $PROJECT_ROOT

firebase init hosting

Accept the defaults for all of the prompts.

Replace public/index.html with the following:

<!DOCTYPE html>
<html>
  <head>
    <title>Genkit demo</title>
  </head>
  <body>
    <div id="signin" hidden>
      <button id="signinBtn">Sign in with Google</button>
    </div>
    <div id="callGenkit" hidden>
      Subject: <input type="text" id="subject" />
      <button id="generatePoem">Compose a poem on this subject</button>
      <p id="generatedPoem"></p>
    </div>
    <script type="module">
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
      import {
        getAuth,
        onAuthStateChanged,
        GoogleAuthProvider,
        signInWithPopup,
      } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
      import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

      const firebaseConfig = await fetch('/__/firebase/init.json');
      initializeApp(await firebaseConfig.json());

      async function generatePoem() {
        const poemFlow = httpsCallable(getFunctions(), 'generatePoem');
        const subject = document.querySelector('#subject').value;
        const response = await poemFlow({ subject });
        document.querySelector('#generatedPoem').innerText = response.data.poem;
      }

      function signIn() {
        signInWithPopup(getAuth(), new GoogleAuthProvider());
      }

      document.querySelector('#signinBtn').addEventListener('click', signIn);
      document.querySelector('#generatePoem').addEventListener('click', generatePoem);

      const signinEl = document.querySelector('#signin');
      const genkitEl = document.querySelector('#callGenkit');

      onAuthStateChanged(getAuth(), (user) => {
        if (!user) {
          signinEl.hidden = false;
          genkitEl.hidden = true;
        } else {
          signinEl.hidden = true;
          genkitEl.hidden = false;
        }
      });
    </script>
  </body>
</html>

Deploy the web app and Cloud Function:

Terminal window
cd $PROJECT_ROOT

firebase deploy

Open the web app by visiting the URL printed by the deploy command. The app requires you to sign in with a Google account, after which you can initiate endpoint requests.

Optional: Run flows in the developer UI
You can run flows defined using onCallGenkit in the developer UI, exactly the same way as you run flows defined using defineFlow, so there’s no need to switch between the two between deployment and development.

Terminal window
cd $PROJECT_ROOT/functions

genkit start -- npx tsx --watch src/index.ts

or

Terminal window
cd $PROJECT_ROOT/functions

npm run genkit:start

You can now navigate to the URL printed by the genkit start command to access.

Optional: Developing using Firebase Local Emulator Suite
Firebase offers a suite of emulators for local development, which you can use with Genkit.

To use the Genkit Dev UI with the Firebase Emulator Suite, start the Firebase emulators as follows:

Terminal window
genkit start -- firebase emulators:start --inspect-functions

This command runs your code in the emulator, and runs the Genkit framework in development mode. This launches and exposes the Genkit reflection API (but not the Dev UI).

Authorization and integrity
When building any public-facing application, it’s extremely important to protect the data stored in your system. When it comes to LLMs, extra diligence is necessary to ensure that the model is only accessing data it should, tool calls are properly scoped to the user invoking the LLM, and the flow is being invoked only by verified client applications.

Genkit provides mechanisms for managing authorization policies and contexts. Flows running on Firebase can use an auth policy callback (or helper). Alternatively, Firebase also provides auth context into the flow where it can do its own checks. For non-Functions flows, auth can be managed and set through middleware.

Authorize within a Flow
Flows can check authorization in two ways: either the request binding (e.g. onCallGenkit for Cloud Functions for Firebase or express) can enforce authorization, or those frameworks can pass auth policies to the flow itself, where the flow has access to the information for auth managed within the flow.

import { genkit, z, UserFacingError } from 'genkit';

const ai = genkit({ ... });

export const selfSummaryFlow = ai.defineFlow( {
  name: 'selfSummaryFlow',
  inputSchema: z.object({ uid: z.string() }),
  outputSchema: z.object({ profileSummary: z.string() }),
}, async (input, { context }) => {
  if (!context.auth) {
    throw new UserFacingErrorError('UNAUTHENTICATED', 'Unauthenticated');
  }
  if (input.uid !== context.auth.uid) {
    throw new UserFacingError('PERMISSION_DENIED', 'You may only summarize your own profile data.');
  }
  // Flow logic here...
  return { profileSummary: "User profile summary would go here" };
});

It is up to the request binding to populate context.auth in this case. For example, onCallGenkit automatically populates context.auth (Firebase Authentication), context.app (Firebase App Check), and context.instanceIdToken (Firebase Cloud Messaging). When calling a flow manually, you can add your own auth context manually.

// Error: Authorization required.
await selfSummaryFlow({ uid: 'abc-def' });

// Error: You may only summarize your own profile data.
await selfSummaryFlow.run(
  { uid: 'abc-def' },
  {
    context: { auth: { uid: 'hij-klm' } },
  },
);

// Success
await selfSummaryFlow(
  { uid: 'abc-def' },
  {
    context: { auth: { uid: 'abc-def' } },
  },
);

When running with the Genkit Development UI, you can pass the Auth object by entering JSON in the “Auth JSON” tab: {"uid": "abc-def"}.

You can also retrieve the auth context for the flow at any time within the flow by calling ai.currentContext(), including in functions invoked by the flow:

import { genkit, z } from 'genkit';

const ai = genkit({ ... });;

async function readDatabase(uid: string) {
  const auth = ai.currentContext()?.auth;
  // Note: the shape of context.auth depends on the provider. onCallGenkit puts
  // claims information in auth.token
  if (auth?.token?.admin) {
    // Do something special if the user is an admin
  } else {
    // Otherwise, use the `uid` variable to retrieve the relevant document
  }
}

export const selfSummaryFlow = ai.defineFlow(
  {
    name: 'selfSummaryFlow',
    inputSchema: z.object({ uid: z.string() }),
    outputSchema: z.object({ profileSummary: z.string() }),
    authPolicy: ...
  },
  async (input) => {
    await readDatabase(input.uid);
    return { profileSummary: "User profile summary would go here" };
  }
);

When testing flows with Genkit dev tools, you are able to specify this auth object in the UI, or on the command line with the --context flag:

Terminal window
genkit flow:run selfSummaryFlow '{"uid": "abc-def"}' --context '{"auth": {"email_verified": true}}'

Authorize using Cloud Functions for Firebase
The Cloud Functions for Firebase SDKs support Genkit including integration with Firebase Auth / Google Cloud Identity Platform, as well as built-in Firebase App Check support.

User authentication
The onCallGenkit() wrapper provided by the Firebase Functions library has built-in support for the Cloud Functions for Firebase client SDKs. When you use these SDKs, the Firebase Auth header is automatically included as long as your app client is also using the Firebase Auth SDK. You can use Firebase Auth to protect your flows defined with onCallGenkit():

import { genkit } from 'genkit';
import { onCallGenkit } from 'firebase-functions/https';

const ai = genkit({ ... });;

const selfSummaryFlow = ai.defineFlow({
  name: 'selfSummaryFlow',
  inputSchema: z.object({ userQuery: z.string() }),
  outputSchema: z.object({ profileSummary: z.string() }),
}, async ({ userQuery }) => {
  // Flow logic here...
  return { profileSummary: "User profile summary based on query would go here" };
});

export const selfSummary = onCallGenkit({
  authPolicy: (auth) => auth?.token?.['email_verified'] && auth?.token?.['admin'],
}, selfSummaryFlow);

When you use onCallGenkit, context.auth is returned as an object with a uid for the user ID, and a token that is a DecodedIdToken. You can always retrieve this object at any time using ai.currentContext() as noted earlier. When running this flow during development, you would pass the user object in the same way:

Terminal window
genkit flow:run selfSummaryFlow '{"uid": "abc-def"}' --context '{"auth": {"admin": true}}'

Whenever you expose a Cloud Function to the wider internet, it is vitally important that you use some sort of authorization mechanism to protect your data and the data of your customers. With that said, there are times when you need to deploy a Cloud Function with no code-based authorization checks (for example, your Function is not world-callable but instead is protected by Cloud IAM). Cloud Functions for Firebase lets you to do this using the invoker property, which controls IAM access. The special value 'private' leaves the function as the default IAM setting, which means that only callers with the Cloud Run Invoker role can execute the function. You can instead provide the email address of a user or service account that should be granted permission to call this exact function.

import { onCallGenkit } from 'firebase-functions/https';

const selfSummaryFlow = ai.defineFlow(
  {
    name: 'selfSummaryFlow',
    inputSchema: z.object({ userQuery: z.string() }),
    outputSchema: z.object({ profileSummary: z.string() }),
  },
  async ({ userQuery }) => {
    // Flow logic here...
    return { profileSummary: "User profile summary based on query would go here" };
  },
);

export const selfSummary = onCallGenkit(
  {
    invoker: 'private',
  },
  selfSummaryFlow,
);

Client integrity
Authentication on its own goes a long way to protect your app. But it’s also important to ensure that only your client apps are calling your functions. The Firebase plugin for genkit includes first-class support for Firebase App Check. Do this by adding the following configuration options to your onCallGenkit():

import { onCallGenkit } from 'firebase-functions/https';

const selfSummaryFlow = ai.defineFlow({
  name: 'selfSummaryFlow',
  inputSchema: z.object({ userQuery: z.string() }),
  outputSchema: z.object({ profileSummary: z.string() }),
}, async ({ userQuery }) => {
  // Flow logic here...
  return { profileSummary: "User profile summary based on query would go here" };
});

export const selfSummary = onCallGenkit({
  // These two fields for app check. The consumeAppCheckToken option is for
  // replay protection, and requires additional client configuration. See the
  // App Check docs.
  enforceAppCheck: true,
  consumeAppCheckToken: true,

  authPolicy: ...,
}, selfSummaryFlow);

Non-Firebase HTTP authorization
When deploying flows to a server context outside of Cloud Functions for Firebase, you’ll want to have a way to set up your own authorization checks alongside the built-in flows.

Use a ContextProvider to populate context values such as auth, and to provide a declarative policy or a policy callback. The Genkit SDK provides ContextProviders such as apiKey, and plugins may expose them as well. For example, the @genkit-ai/firebase/context plugin exposes a context provider for verifying Firebase Auth credentials and populating them into context.

With code like the following, which might appear in a variety of applications:

// Express app with a simple API key
import { genkit, z } from 'genkit';

const ai = genkit({ ... });;

export const selfSummaryFlow = ai.defineFlow(
  {
    name: 'selfSummaryFlow',
    inputSchema: z.object({ uid: z.string() }),
    outputSchema: z.object({ profileSummary: z.string() }),
  },
  async (input) => {
    // Flow logic here...
    return { profileSummary: "User profile summary would go here" };
  }
);

You could secure a simple “flow server” express app by writing:

import { apiKey } from 'genkit/context';
import { startFlowServer, withContextProvider } from '@genkit-ai/express';

startFlowServer({
  flows: [withContextProvider(selfSummaryFlow, apiKey(process.env.REQUIRED_API_KEY))],
});

Or you could build a custom express application using the same tools:

import { apiKey } from "genkit/context";
import * as express from "express";
import { expressHandler } from "@genkit-ai/express;

const app = express();
// Capture but don't validate the API key (or its absence)
app.post('/summary', expressHandler(selfSummaryFlow, { contextProvider: apiKey()}))

app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
})

ContextProviders abstract out the web framework, so these tools work in other frameworks like Next.js as well. Here is an example of a Firebase app built on Next.js.

import { appRoute } from '@genkit-ai/express';
import { firebaseContext } from '@genkit-ai/firebase';

export const POST = appRoute(selfSummaryFlow, {
  contextProvider: firebaseContext,
});

Use Genkit in a Next.js app
This page shows how you can use Genkit flows in your Next.js applications using the official Genkit Next.js plugin. For complete API reference documentation, see the Genkit Next.js Plugin API Reference.

Before you begin
You should be familiar with Genkit’s concept of flows, and how to write them.

Create a Next.js project
If you don’t already have a Next.js project that you want to add generative AI features to, you can create one for the purpose of following along with this page:

Terminal window
npx create-next-app@latest --src-dir

The --src-dir flag creates a src/ directory to keep your project organized by separating source code from configuration files.

Install Genkit dependencies
Install the Genkit dependencies into your Next.js app:

Install the core Genkit library and the Next.js plugin:

Terminal window
npm install genkit @genkit-ai/next

Install at least one model plugin.

Gemini (Google AI)
Gemini (Vertex AI)
Terminal window
npm install @genkit-ai/googleai

Install the Genkit CLI globally. The tsx tool is also recommended as a development dependency, as it makes testing your code more convenient. Both of these dependencies are optional, however.

Terminal window
npm install -g genkit-cli
npm install --save-dev tsx

Define Genkit flows
Create a new directory in your Next.js project to contain your Genkit flows. Create src/genkit/ and add your flow definitions there:

For example, create src/genkit/menuSuggestionFlow.ts:

Gemini (Google AI)
Gemini (Vertex AI)
import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
});

export const menuSuggestionFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.object({ theme: z.string() }),
    outputSchema: z.object({ menuItem: z.string() }),
    streamSchema: z.string(),
  },
  async ({ theme }, { sendChunk }) => {
    const { stream, response } = ai.generateStream({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Invent a menu item for a ${theme} themed restaurant.`,
    });

    for await (const chunk of stream) {
      sendChunk(chunk.text);
    }

    const { text } = await response;
    return { menuItem: text };
  }
);

Create API routes
Now, create API routes that expose your flows using the Genkit Next.js plugin. For each flow, create a corresponding route file:

Create src/app/api/menuSuggestion/route.ts:

import { menuSuggestionFlow } from '@/genkit/menuSuggestionFlow';
import { appRoute } from '@genkit-ai/next';

export const POST = appRoute(menuSuggestionFlow);

Call your flows from the frontend
In your frontend code, you can now call your flows using the Genkit Next.js client:

'use client';

import { useState } from 'react';
import { runFlow, streamFlow } from '@genkit-ai/next/client';
import { menuSuggestionFlow } from '@/genkit/menuSuggestionFlow';

export default function Home() {
  const [menuItem, setMenuItem] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState<string>('');

  async function getMenuItem(formData: FormData) {
    const theme = formData.get('theme')?.toString() ?? '';
    setIsLoading(true);

    try {
      // Regular (non-streaming) approach
      const result = await runFlow<typeof menuSuggestionFlow>({
        url: '/api/menuSuggestion',
        input: { theme },
      });

      setMenuItem(result.menuItem);
    } catch (error) {
      console.error('Error generating menu item:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function streamMenuItem(formData: FormData) {
    const theme = formData.get('theme')?.toString() ?? '';
    setIsLoading(true);
    setStreamedText('');

    try {
      // Streaming approach
      const result = streamFlow<typeof menuSuggestionFlow>({
        url: '/api/menuSuggestion',
        input: { theme },
      });

      // Process the stream chunks as they arrive
      for await (const chunk of result.stream) {
        setStreamedText((prev) => prev + chunk);
      }

      // Get the final complete response
      const finalOutput = await result.output;
      setMenuItem(finalOutput.menuItem);
    } catch (error) {
      console.error('Error streaming menu item:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <form action={getMenuItem}>
        <label htmlFor="theme">Suggest a menu item for a restaurant with this theme: </label>
        <input type="text" name="theme" id="theme" />
        <br />
        <br />
        <button type="submit" disabled={isLoading}>
          Generate
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget.form!);
            streamMenuItem(formData);
          }}
        >
          Stream Generation
        </button>
      </form>
      <br />

      {streamedText && (
        <div>
          <h3>Streaming Output:</h3>
          <pre>{streamedText}</pre>
        </div>
      )}

      {menuItem && (
        <div>
          <h3>Final Output:</h3>
          <pre>{menuItem}</pre>
        </div>
      )}
    </main>
  );
}

Authentication (Optional)
If you need to add authentication to your API routes, you can pass headers with your requests:

const result = await runFlow<typeof menuSuggestionFlow>({
  url: '/api/menuSuggestion',
  headers: {
    Authorization: 'Bearer your-token-here',
  },
  input: { theme },
});

Test your app locally
If you want to run your app locally, you need to make credentials for the model API service you chose available.

Gemini (Google AI)
Gemini (Vertex AI)
Generate an API key for the Gemini API using Google AI Studio.

Set the GEMINI_API_KEY environment variable to your key:

Terminal window
export GEMINI_API_KEY=<your API key>

Then, run your app locally as normal:

Terminal window
npm run dev

For Genkit development tools, you can still use:

Terminal window
genkit start -- npx tsx --watch src/genkit/menuSuggestionFlow.ts

Deploy your app
When you deploy your app, you will need to make sure the credentials for any external services you use (such as your chosen model API service) are available to the deployed app. See the following pages for information specific to your chosen deployment platform:

Deploy flows using Cloud Functions for Firebase
Cloud Functions for Firebase has an onCallGenkit method that lets you quickly create a callable function with a Genkit action (e.g. a Flow). These functions can be called using genkit/beta/clientor the Functions client SDK, which automatically adds auth info.

Before you begin
You should be familiar with Genkit’s concept of flows, and how to write them. The instructions on this page assume that you already have some flows defined, which you want to deploy.
It would be helpful, but not required, if you’ve already used Cloud Functions for Firebase before.
1. Set up a Firebase project
If you don’t already have a Firebase project with TypeScript Cloud Functions set up, follow these steps:

Create a new Firebase project using the Firebase console or choose an existing one.

Upgrade the project to the Blaze plan, which is required to deploy Cloud Functions.

Install the Firebase CLI.

Log in with the Firebase CLI:

Terminal window
firebase login

firebase login --reauth # alternative, if necessary

firebase login --no-localhost # if running in a remote shell

Create a new project directory:

Terminal window
export PROJECT_ROOT=~/tmp/genkit-firebase-project1

mkdir -p $PROJECT_ROOT

Initialize a Firebase project in the directory:

Terminal window
cd $PROJECT_ROOT

firebase init genkit

The rest of this page assumes that you’ve decided to write your functions in TypeScript, but you can also deploy your Genkit flows if you’re using JavaScript.

2. Wrap the Flow in onCallGenkit
After you’ve set up a Firebase project with Cloud Functions, you can copy or write flow definitions in the project’s functions/src directory, and export them in index.ts.

For your flows to be deployable, you need to wrap them in onCallGenkit. This method has all the features of the normal onCall. It automatically supports both streaming and JSON responses.

Suppose you have the following flow:

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

You can expose this flow as a callable function using onCallGenkit:

import { onCallGenkit } from 'firebase-functions/https';

export generatePoem = onCallGenkit(generatePoemFlow);

Define an authorization policy
All deployed flows, whether deployed to Firebase or not, should have an authorization policy; without one, anyone can invoke your potentially-expensive generative AI flows. To define an authorization policy, use the authPolicy parameter of onCallGenkit:

export const generatePoem = onCallGenkit(
  {
    authPolicy: (auth) => auth?.token?.email_verified,
  },
  generatePoemFlow,
);

This sample uses a manual function as its auth policy. In addition, the https library exports the signedIn() and hasClaim() helpers. Here is the same code using one of those helpers:

import { hasClaim } from 'firebase-functions/https';

export const generatePoem = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
  },
  generatePoemFlow,
);

Make API credentials available to deployed flows
Once deployed, your flows need some way to authenticate with any remote services they rely on. Most flows need, at a minimum, credentials for accessing the model API service they use.

For this example, do one of the following, depending on the model provider you chose:

Gemini (Google AI)
Gemini (Vertex AI)
Make sure Google AI is available in your region.

Generate an API key for the Gemini API using Google AI Studio.

Store your API key in Cloud Secret Manager:

Terminal window
firebase functions:secrets:set GEMINI_API_KEY

This step is important to prevent accidentally leaking your API key, which grants access to a potentially metered service.

See Store and access sensitive configuration information for more information on managing secrets.

Edit src/index.ts and add the following after the existing imports:

import { defineSecret } from "firebase-functions/params";
const googleAIapiKey = defineSecret("GEMINI_API_KEY");

Then, in the flow definition, declare that the cloud function needs access to this secret value:

export const generatePoem = onCallGenkit(
  {
    secrets: [googleAIapiKey],
  },
  generatePoemFlow
);

Now, when you deploy this function, your API key is stored in Cloud Secret Manager, and available from the Cloud Functions environment.

The only secret you need to set up for this tutorial is for the model provider, but in general, you must do something similar for each service your flow uses.

Add App Check enforcement
Firebase App Check uses a built-in attestation mechanism to verify that your API is only being called by your application. onCallGenkit supports App Check enforcement declaratively.

export const generatePoem = onCallGenkit(
  {
    enforceAppCheck: true,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: true,
  },
  generatePoemFlow,
);

Set a CORS policy
Callable functions default to allowing any domain to call your function. If you want to customize the domains that can do this, use the cors option. With proper authentication (especially App Check), CORS is often unnecessary.

export const generatePoem = onCallGenkit(
  {
    cors: 'mydomain.com',
  },
  generatePoemFlow,
);

Complete example
After you’ve made all of the changes described earlier, your deployable flow looks something like the following example:

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});

const generatePoemFlow = ai.defineFlow(
  {
    name: 'generatePoem',
    inputSchema: z.object({ subject: z.string() }),
    outputSchema: z.object({ poem: z.string() }),
  },
  async ({ subject }) => {
    const { text } = await ai.generate(`Compose a poem about ${subject}.`);
    return { poem: text };
  },
);

export const generatePoem = onCallGenkit(
  {
    secrets: [apiKey],
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  generatePoemFlow,
);

3. Deploy flows to Firebase
After you’ve defined flows using onCallGenkit, you can deploy them the same way you would deploy other Cloud Functions:

Terminal window
cd $PROJECT_ROOT

firebase deploy --only functions

You’ve now deployed the flow as a Cloud Function! But you can’t access your deployed endpoint with curl or similar, because of the flow’s authorization policy. The next section explains how to securely access the flow.

Optional: Try the deployed flow
To try out your flow endpoint, you can deploy the following minimal example web app:

In the Project settings section of the Firebase console, add a new web app, selecting the option to also set up Hosting.

In the Authentication section of the Firebase console, enable the Google provider, used in this example.

In your project directory, set up Firebase Hosting, where you will deploy the sample app:

Terminal window
cd $PROJECT_ROOT

firebase init hosting

Accept the defaults for all of the prompts.

Replace public/index.html with the following:

<!DOCTYPE html>
<html>
  <head>
    <title>Genkit demo</title>
  </head>
  <body>
    <div id="signin" hidden>
      <button id="signinBtn">Sign in with Google</button>
    </div>
    <div id="callGenkit" hidden>
      Subject: <input type="text" id="subject" />
      <button id="generatePoem">Compose a poem on this subject</button>
      <p id="generatedPoem"></p>
    </div>
    <script type="module">
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
      import {
        getAuth,
        onAuthStateChanged,
        GoogleAuthProvider,
        signInWithPopup,
      } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
      import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

      const firebaseConfig = await fetch('/__/firebase/init.json');
      initializeApp(await firebaseConfig.json());

      async function generatePoem() {
        const poemFlow = httpsCallable(getFunctions(), 'generatePoem');
        const subject = document.querySelector('#subject').value;
        const response = await poemFlow({ subject });
        document.querySelector('#generatedPoem').innerText = response.data.poem;
      }

      function signIn() {
        signInWithPopup(getAuth(), new GoogleAuthProvider());
      }

      document.querySelector('#signinBtn').addEventListener('click', signIn);
      document.querySelector('#generatePoem').addEventListener('click', generatePoem);

      const signinEl = document.querySelector('#signin');
      const genkitEl = document.querySelector('#callGenkit');

      onAuthStateChanged(getAuth(), (user) => {
        if (!user) {
          signinEl.hidden = false;
          genkitEl.hidden = true;
        } else {
          signinEl.hidden = true;
          genkitEl.hidden = false;
        }
      });
    </script>
  </body>
</html>

Deploy the web app and Cloud Function:

Terminal window
cd $PROJECT_ROOT

firebase deploy

Open the web app by visiting the URL printed by the deploy command. The app requires you to sign in with a Google account, after which you can initiate endpoint requests.

Optional: Run flows in the developer UI
You can run flows defined using onCallGenkit in the developer UI, exactly the same way as you run flows defined using defineFlow, so there’s no need to switch between the two between deployment and development.

Terminal window
cd $PROJECT_ROOT/functions

genkit start -- npx tsx --watch src/index.ts

or

Terminal window
cd $PROJECT_ROOT/functions

npm run genkit:start

You can now navigate to the URL printed by the genkit start command to access.

Optional: Developing using Firebase Local Emulator Suite
Firebase offers a suite of emulators for local development, which you can use with Genkit.

To use the Genkit Dev UI with the Firebase Emulator Suite, start the Firebase emulators as follows:

Terminal window
genkit start -- firebase emulators:start --inspect-functions

This command runs your code in the emulator, and runs the Genkit framework in development mode. This launches and exposes the Genkit reflection API (but not the Dev UI).

