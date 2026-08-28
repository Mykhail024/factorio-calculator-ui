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
as a Git subtree in `src/`. The upstream calculator is licensed under the
Apache License 2.0.

Project-specific Tauri wrapper code, build scripts, dataset tooling, and
persistence integration are also licensed under the Apache License 2.0.

See [NOTICE](NOTICE) for third-party attribution.

## Factorio game data and assets

The `game-data/` directory may contain generated Factorio recipe datasets and
sprite sheets produced with [`factoriodump`](https://github.com/KirkMcDonald/factorio-tools) from a locally installed copy of
Factorio. Those files are derived from Factorio game data and assets and are
**not** licensed under this repository's Apache-2.0 license.

These files are provided for personal, non-commercial use only. Redistribution
or commercial use may be restricted by the Factorio Terms of Service.
Factorio, Factorio: Space Age, associated game data, graphics, and trademarks
are the property of Wube Software Ltd.

Users are expected to generate their own datasets from a legally owned
Factorio installation.

Users must own the applicable game and DLC and must comply with the applicable
Factorio license and terms when generating, using, copying, or redistributing
such derived data.
