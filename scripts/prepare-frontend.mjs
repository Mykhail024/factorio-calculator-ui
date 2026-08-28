import {
    cp,
    mkdir,
    readdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises"
import path from "node:path"
import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
                          "..",
)

const sourceDir = path.join(root, "src")
const outputDir = path.join(root, "dist")
const gameDataDir = path.join(root, "game-data")
const settingsPath = path.join(outputDir, "settings.js")

function isVersion(value) {
    return /^\d+\.\d+\.\d+$/.test(value)
}

function versionParts(version) {
    return version.split(".").map(Number)
}

function compareVersions(a, b) {
    const left = versionParts(a)
    const right = versionParts(b)

    for (let index = 0; index < 3; index += 1) {
        if (left[index] !== right[index]) {
            return right[index] - left[index]
        }
    }

    return 0
}

async function exists(filePath) {
    try {
        await stat(filePath)
        return true
    } catch {
        return false
    }
}

async function detectDatasetKind(normalPath) {
    const content = await readFile(normalPath, "utf8")

    const spaceAgeMarkers = [
        '"space-platform"',
        '"electromagnetic-plant"',
        '"cryogenic-plant"',
        '"foundry"',
        '"planet"',
        '"vulcanus"',
        '"fulgora"',
        '"gleba"',
        '"aquilo"',
    ]

    return spaceAgeMarkers.some((marker) => content.includes(marker))
    ? "space-age"
    : "vanilla"
}

async function getDatasets() {
    if (!(await exists(gameDataDir))) {
        return []
    }

    const entries = await readdir(gameDataDir, {
        withFileTypes: true,
    })

    const datasets = []

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }

        const directory = path.join(gameDataDir, entry.name)
        const metadata = await readDatasetMetadata(directory)

        const version = metadata?.version ?? (
            isVersion(entry.name) ? entry.name : null
        )

        if (version === null || !isVersion(version)) {
            console.warn(
                `Skipping ${entry.name}: missing or invalid dataset version.`,
            )
            continue
        }

        const dataDir = path.join(directory, "data")
        const imagesDir = path.join(directory, "images")

        const normalFile = metadata?.dataFile ??
        `vanilla-${version}.json`

        const expensiveFile = metadata?.expensiveFile ??
        `vanilla-${version}-expensive.json`

        const normalPath = path.join(dataDir, normalFile)
        const expensivePath = path.join(dataDir, expensiveFile)

        if (!(await exists(normalPath))) {
            console.warn(
                `Skipping ${entry.name}: missing ${normalFile}.`,
            )
            continue
        }

        const enabledMods = Array.isArray(metadata?.enabledMods)
        ? metadata.enabledMods
        : []

        // If dataset.json doesn't exist.
        const kind = metadata?.kind ?? await detectDatasetKind(normalPath)

        const id = metadata?.id ??
        `${kind}-${version.replaceAll(".", "-")}`

        const name = metadata?.name ??
        `${kind === "space-age" ? "Space Age" : "Local data"} ${version}`

        datasets.push({
            id,
            name,
            kind,
            version,
            directory,
            dataDir,
            imagesDir,
            normalFile,
            expensiveFile,
            hasExpensive: await exists(expensivePath),
                      hasImages: await exists(imagesDir),
                      enabledMods,
                      metadataPath: path.join(directory, "dataset.json"),
        })
    }

    return datasets.sort((a, b) => {
        const byVersion = compareVersions(a.version, b.version)

        if (byVersion !== 0) {
            return byVersion
        }

        return a.name.localeCompare(b.name)
    })
}

async function chooseDataset(datasets) {
    if (datasets.length === 1) {
        console.log(`Using only available dataset: ${datasets[0].version}`)
        return datasets[0]
    }

    if (!stdin.isTTY || !stdout.isTTY) {
        console.log(
            `No interactive terminal; using latest dataset: ${datasets[0].version}`,
        )
        return datasets[0]
    }

    console.log("\nAvailable Factorio datasets:")

    datasets.forEach((dataset, index) => {
        const notes = [
            dataset.hasExpensive ? "expensive" : "no expensive file",
            dataset.hasImages ? "sprites" : "no sprites",
        ]

        console.log(
            `  ${index + 1}. ${dataset.name} (${notes.join(", ")})${mods}`,
        )
    })

    const rl = createInterface({
        input: stdin,
        output: stdout,
    })

    try {
        while (true) {
            const answer = (
                await rl.question(
                    `\nChoose dataset [1-${datasets.length}] (default 1): `,
                )
            ).trim()

            if (answer === "") {
                return datasets[0]
            }

            const selectedIndex = Number.parseInt(answer, 10) - 1

            if (
                Number.isInteger(selectedIndex) &&
                selectedIndex >= 0 &&
                selectedIndex < datasets.length
            ) {
                return datasets[selectedIndex]
            }

            console.log(
                `Please enter a number from 1 to ${datasets.length}.`,
            )
        }
    } finally {
        rl.close()
    }
}

async function readDatasetMetadata(directory) {
    const metadataPath = path.join(directory, "dataset.json")

    if (!(await exists(metadataPath))) {
        return null
    }

    try {
        const raw = await readFile(metadataPath, "utf8")
        return JSON.parse(raw)
    } catch (error) {
        throw new Error(
            `Invalid dataset metadata: ${metadataPath}\n${error.message}`,
        )
    }
}

async function copyDataset(dataset) {
    const outputDataDir = path.join(outputDir, "data")
    const outputImagesDir = path.join(outputDir, "images")

    await mkdir(outputDataDir, { recursive: true })
    await mkdir(outputImagesDir, { recursive: true })

    await cp(
        path.join(dataset.dataDir, dataset.normalFile),
             path.join(outputDataDir, dataset.normalFile),
    )

    if (dataset.hasExpensive) {
        await cp(
            path.join(dataset.dataDir, dataset.expensiveFile),
                 path.join(outputDataDir, dataset.expensiveFile),
        )
    }

    if (dataset.hasImages) {
        await cp(dataset.imagesDir, outputImagesDir, {
            recursive: true,
            force: true,
        })
    }
}

async function patchSettings(dataset) {
    const modificationId = dataset.id
    const modificationName = dataset.name

    let settings = await readFile(settingsPath, "utf8")

    const modificationPattern = new RegExp(
        String.raw`\s*\["${modificationId.replaceAll("-", "\\-")}",[\s\S]*?\],\n?`,
                                           "g",
    )

    settings = settings.replace(modificationPattern, "")

    const modificationEntry = [
        `    ["${modificationId}", new Modification(`,
                                                    `        "${modificationName}",`,
                                                    `        "${dataset.normalFile}",`,
                                                    `        false,`,
                                                    `    )],`,
    ].join("\n")

    const marker = "export let MODIFICATIONS = new Map(["

    if (!settings.includes(marker)) {
        throw new Error(
            `Cannot patch ${settingsPath}: MODIFICATIONS declaration was not found.`,
        )
    }

    settings = settings.replace(
        marker,
        `${marker}\n${modificationEntry}`,
    )

    settings = settings.replace(
        /let DEFAULT_MODIFICATION = "[^"]+"/,
        `let DEFAULT_MODIFICATION = "${modificationId}"`,
    )

    await writeFile(settingsPath, settings)
}

async function main() {
    if (!(await exists(sourceDir))) {
        throw new Error(`Source subtree directory is missing: ${sourceDir}`)
    }

    await rm(outputDir, {
        recursive: true,
        force: true,
    })

    await cp(sourceDir, outputDir, {
        recursive: true,
        force: true,
    })

    const datasets = await getDatasets()

    if (datasets.length === 0) {
        console.warn(
            [
                "",
                "No local Factorio datasets were found.",
                `Expected custom datasets in: ${gameDataDir}`,
                "",
                "Prepared dist/ using only the datasets bundled with",
                "the upstream https://github.com/KirkMcDonald/kirkmcdonald.github.io subtree (src/data/).",
                "",
                "To add a local Factorio dump later, use:",
                "  game-data/<version>/data/vanilla-<version>.json",
                "  game-data/<version>/images/sprite-sheet-<hash>.png",
            ].join("\n"),
        )

        console.log("\nPrepared dist/ with upstream calculator datasets.")
        return
    }

    const dataset = await chooseDataset(datasets)

    await copyDataset(dataset)
    await patchSettings(dataset)

    console.log(
        `\nPrepared dist/ with Space Age ${dataset.version}.`,
    )
    console.log(
        `Default recipe set: Space Age ${dataset.version}.`,
    )
}

main().catch((error) => {
    console.error(`\nprepare:frontend failed:\n${error.message}`)
    process.exitCode = 1
})
