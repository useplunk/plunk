# Contributing

You can greatly support Plunk by contributing to this repository.

Support can be asked in the `#contributions` channel of the [Plunk Discord server](https://useplunk.com/discord)

### 1. Requirements

- Docker needs to be [installed](https://docs.docker.com/engine/install/) on your system.

### 2. Set your environment variables

- Copy the `.env.example` files in the `api`, `dashboard` and `prisma` folder to `.env` in their respective folders.

### 3. Start resources

- Run `yarn services:up` to start a local database and a local redis server.
- Run `yarn migrate` to apply the migrations to the database.
- Run `yarn build:shared` to build the shared package.


- Run `yarn dev:api` to start the API server.
- Run `yarn dev:dashboard` to start the dashboard server.

