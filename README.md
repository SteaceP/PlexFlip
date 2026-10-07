# NEVU for Plex

Fixing Plex's old and simple UI.

[**Now also available for Android & AndroidTV**](https://github.com/Ipmake/Nevu/discussions/43)

[**Docker Hub**](https://hub.docker.com/r/ipmake/nevu)

_Click image for video_
[![Nevu1](assets/screenshot1.png)](https://www.youtube.com/watch?v=PuTOw3Wg9oY)
![Nevu2](assets/screenshot2.png)
[More Screenshots](https://github.com/Ipmake/Nevu/tree/main/assets)

## Description

Nevu is a complete redesign of Plex's UI using the Plex media server's API. It comes with its own web server. It is currently only developed for desktops and laptops. It is not optimized for mobile or TV use.

Nevu currently supports Movie and TV Show libraries. You can also play media via the interface.

Mind that this project is still in development and may be unstable.

## Features
- Modern, immersive UI
- Seamless Plex integration
- Play media
- Automatic track matching (Keep the same audio and subtitle language across episodes)
- Browse libraries
- Search for media
- Watch Together (Nevu Sync)
- Get Recommendations
- Fully integrated Watchlist
- Simple and easy to use
- Pro-User features (like special shortcuts etc.)

## Installation

### Docker

The easiest way to run Nevu is to use Docker. You can use the following command to run Nevu in a Docker container:

```bash
docker volume create nevu_data
docker run --name nevu -p 3000:3000 -p 44201:44201/udp -v nevu_data:/data -e PLEX_SERVER=http://your-plex-server:32400 ipmake/nevu
```

### Docker Compose

Alternatively, you can use Docker Compose to run Nevu. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  nevu:
    image: ipmake/nevu
    container_name: nevu
    ports:
      - "3000:3000"
      - "44201:44201/udp"
    volumes:
      - nevu_data:/data
    environment:
      - PLEX_SERVER=http://your-plex-server:32400

volumes:
  nevu_data:
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
| `LISTEN_PORT`             | number     | No       | The port the nevu server will listen on                                          |
| `DISABLE_TLS_VERIFY`      | true/false | No       | If set to true, the proxy will not check any https ssl certificates              |
| `DISABLE_NEVU_SYNC`       | true/false | No       | If set to true, Nevu sync (watch together) will be disabled                      |
| `DISABLE_REQUEST_LOGGING` | true/false | No       | If set to true, the server will not log any requests                             |
| `DISABLE_GLOBAL_REVIEWS`  | true/false | No       | If set to true, nevu global reviews will be disabled                             |

## Contributing

Pull requests are welcome for any feature or a bug fix. For major changes, please open an issue first to discuss what you would like to change.

## Wails v3 Desktop Application

Nevu is packaged as a native desktop application using **Wails v3**.

### Desktop Development
Run Nevu in Wails v3 dev mode with live reload:

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

The resulting native desktop executable is created at `bin/nevu`.

Run it directly on your desktop:

```bash
PLEX_SERVER=http://your-plex-server:32400 ./bin/nevu
```

When run in a desktop environment (X11 / Wayland), Nevu launches as a dedicated desktop window.

### Headless & Server Mode

If you want to run Nevu without a GUI (for example on a headless server, in Docker, or via SSH):

- **Automatic headless detection**: If no display server is available (`DISPLAY` and `WAYLAND_DISPLAY` unset), Nevu automatically runs in server mode.
- **Explicit flag/env variable**: Pass `--server` (or `HEADLESS=true`):
  ```bash
  ./bin/nevu --server
  # or
  HEADLESS=true ./bin/nevu
  ```
- **Dedicated server build (no GUI libraries required)**:
  ```bash
  make build-server
  # or
  wails3 task build:server
  ```
  Produces `bin/nevu-server`.

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

