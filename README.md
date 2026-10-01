# PropertPro Mobile

An Expo and React Native real-estate discovery app for browsing properties and development projects, saving listings, connecting with agents, and using buyer-focused tools.

## Highlights

- Personalized property and project feeds.
- Property search, filters, maps, and listing detail views.
- Saved listings, agent profiles, listings, and connections.
- Direct messaging and property chat flows.
- Authentication and profile management.
- Mortgage and rent-versus-buy calculators.

## Tech stack

- Expo and React Native
- TypeScript and React
- Expo Router and React Navigation
- Axios, SecureStore, and AsyncStorage
- Leaflet, React Leaflet, and React Native Maps

## Project structure

- `app/`: file-based routes and screens.
- `components/`: reusable UI components.
- `services/`: service initialization and analytics helpers.
- `data/`: cached and static application data.
- `docs/`: API contracts and component diagrams.

## Local development

Install the locked dependency set:

```bash
npm ci
```

Start the Expo development server:

```bash
npm run start
```

Useful scripts:

```bash
npm run dev
npm run web
npm run web-clear
npm run build:web
npm run lint
```

## Configuration

The app integrates with a backend API and OAuth providers. Keep environment-specific URLs, OAuth client configuration, and credentials out of Git. Use local environment configuration and provider-managed settings for your own development environment.

## Status

This is a portfolio code showcase, not a production release. A dedicated test command, CI workflow, and type-check script are not currently included in the repository.
