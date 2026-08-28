(() => {
    const save = () => {
        const hash = window.location.hash

        if (!hash || !hash.startsWith("#")) {
            return
        }

        window.__TAURI_INTERNALS__
        .invoke("save_hash", { hash })
        .catch((error) => {
            console.error("Cannot save calculator state:", error)
        })
    }

    window.addEventListener("hashchange", save)
    window.addEventListener("pagehide", save)
    window.addEventListener("beforeunload", save)

    setInterval(save, 2_000)
})()
