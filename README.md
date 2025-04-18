## Installation & Development

Install dependencies with `npm install` (or `pnpm install` or `yarn`)

Then ensure the database is up-to-date by running `npx prisma migrate dev`

Populate the database if you haven't already (instructions [here!](https://github.com/seshunASU/covid-visualizer/blob/docs/README.md))

Finally, start a development server:
```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).