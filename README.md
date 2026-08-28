# Factorio Calculator UI

Tauri wrapper for the [KirkMcDonald Factorio Calculator](https://github.com/KirkMcDonald/kirkmcdonald.github.io), packaged as a cross-platform desktop/mobile application.

## Features

- Runs the static Factorio calculator UI in Tauri
- Targets Linux, Windows, and Android through Tauri
- Supports local datasets dumped from an installed Factorio copy
- Supports Factorio 2.x and Space Age when those DLC mods are enabled
- Restores the last calculator URL state between launches

## License

This project is licensed under the [Apache License 2.0](LICENSE).

It includes the Factorio Calculator frontend from
[KirkMcDonald/kirkmcdonald.github.io](https://github.com/KirkMcDonald/kirkmcdonald.github.io)
as a Git subtree in `src/`. The upstream calculator is licensed under Apache License 2.0.

Project-specific Tauri wrapper code, build scripts, dataset tooling, and
persistence integration are also licensed under Apache License 2.0.

See [NOTICE](NOTICE) for third-party attribution.
