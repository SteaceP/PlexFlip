# PlexFlip for Plex

Fixing Plex's old and simple UI.

[**Now also available for Android & AndroidTV**](https://github.com/SteaceP/PlexFlip/discussions/43)

[**Docker Hub**](https://hub.docker.com/r/coderage/plexflip)

_Click image for video_
[![PlexFlip1](assets/screenshot1.png)](https://www.youtube.com/watch?v=PuTOw3Wg9oY)
![PlexFlip2](assets/screenshot2.png)
[More Screenshots](https://github.com/SteaceP/PlexFlip/tree/main/assets)

## Description

PlexFlip is a complete redesign of Plex's UI using the Plex media server's API. It comes with its own web server. It is currently only developed for desktops and laptops. It is not optimized for mobile or TV use.

PlexFlip currently supports Movie and TV Show libraries. You can also play media via the interface.

Mind that this project is still in development and may be unstable.

## Features
- Modern, immersive UI
- Seamless Plex integration
- Play media
- Automatic track matching (Keep the same audio and subtitle language across episodes)
- Browse libraries
- Search for media
- Watch Together (PlexFlip Sync)
- Get Recommendations
- Fully integrated Watchlist
- Simple and easy to use
- Pro-User features (like special shortcuts etc.)

## Installation

### Docker

The easiest way to run PlexFlip is to use Docker. You can use the following command to run PlexFlip in a Docker container:

```bash
docker volume create plexflip_data
docker run --name plexflip -p 3000:3000 -p 44201:44201/udp -v plexflip_data:/data -e PLEX_SERVER=http://your-plex-server:32400 coderage/plexflip
```

### Docker Compose

Alternatively, you can use Docker Compose to run PlexFlip. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  plexflip:
    image: coderage/plexflip
    container_name: plexflip
    ports:
      - "3000:3000"
      - "44201:44201/udp"
    volumes:
      - plexflip_data:/data
    environment:
      - PLEX_SERVER=http://your-plex-server:32400

volumes:
  plexflip_data:
```

Then run:

```bash
docker-compose up -d
```

### Environment Variables

| Name                      | Type       | Required | Description                                                                      |
| ------------------------- | ---------- | -------- | -------------------------------------------------------------------------------- |
| `PLEX_SERVER`             | string     | Yes      | The URL of the Plex server that the backend will proxy to (CAN BE LOCAL)         |
| `PORT`                    | number     | No       | The port you published the docker container to, defaults to 3000 (For discovery) |
| `LISTEN_PORT`             | number     | No       | The port the PlexFlip server will listen on                                          |
| `DISABLE_TLS_VERIFY`      | true/false | No       | If set to true, the proxy will not check any https ssl certificates              |
| `DISABLE_PLEXFLIP_SYNC`   | true/false | No       | If set to true, PlexFlip sync (watch together) will be disabled                      |
| `DISABLE_REQUEST_LOGGING` | true/false | No       | If set to true, the server will not log any requests                             |
| `DISABLE_GLOBAL_REVIEWS`  | true/false | No       | If set to true, PlexFlip global reviews will be disabled                             |

## Contributing

Pull requests are welcome for any feature or a bug fix. For major changes, please open an issue first to discuss what you would like to change.

## Wails v3 Desktop Application

PlexFlip is packaged as a native desktop application using **Wails v3**.

### Desktop Development
Run PlexFlip in Wails v3 dev mode with live reload:

```bash
# Using Wails CLI
wails3 dev

# Or using Make
make wails-dev

# Or using pnpm
pnpm run wails:dev
```

### Building Desktop Binary

```bash
# Using Wails CLI (runs bindings generation, icon generation, frontend build, and Go linking)
wails3 build

# Or using Make
make build

# Or using pnpm
pnpm run build
```

The resulting native desktop executable is created at `bin/plexflip`.

Run it directly on your desktop:

```bash
PLEX_SERVER=http://your-plex-server:32400 ./bin/plexflip
```

When run in a desktop environment (X11 / Wayland), PlexFlip launches as a dedicated desktop window.

### Headless & Server Mode

If you want to run PlexFlip without a GUI (for example on a headless server, in Docker, or via SSH):

- **Automatic headless detection**: If no display server is available (`DISPLAY` and `WAYLAND_DISPLAY` unset), PlexFlip automatically runs in server mode.
- **Explicit flag/env variable**: Pass `--server` (or `HEADLESS=true`):
  ```bash
  ./bin/plexflip --server
  # or
  HEADLESS=true ./bin/plexflip
  ```
- **Dedicated server build (no GUI libraries required)**:
  ```bash
  make build-server
  # or
  wails3 task build:server
  ```
  Produces `bin/plexflip-server`.

### Desktop Packaging

Generate native packages (such as Linux AppImage, `.deb`, `.rpm`):

```bash
wails3 package
# or
make wails-package
```

## Development (Classic Mode)

If you prefer testing frontend and backend in separate browser terminals:

```bash
# Terminal 1 (Frontend)
pnpm --dir frontend start

# Terminal 2 (Backend)
cd backend
PLEX_SERVER=http://your-plex-server:32400 go run .
```

You can also use Make targets:
- `make dev-frontend` - Run React development server
- `make dev-backend` - Run Go backend server
- `make test` - Run backend test suite
- `make clean` - Clean build artifacts

