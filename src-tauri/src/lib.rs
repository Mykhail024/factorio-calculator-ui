use tauri::{
    WebviewUrl,
    WebviewWindowBuilder,
};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "factorio-calculator.json";
const STORE_KEY: &str = "last-url-hash";

const DEFAULT_HASH: &str = "";

const PERSISTENCE_SCRIPT: &str = include_str!("../inject/persistence.js");

#[tauri::command]
fn save_hash(app: tauri::AppHandle, hash: String) -> Result<(), String> {
    if !hash.starts_with('#') {
        return Err("Expected a URL hash beginning with '#'".into());
    }

    let store = app
    .store(STORE_FILE)
    .map_err(|error| error.to_string())?;

    store.set(STORE_KEY, serde_json::Value::String(hash));
    store.save().map_err(|error| error.to_string())?;

    Ok(())
}

fn stored_hash(app: &tauri::AppHandle) -> String {
    let Ok(store) = app.store(STORE_FILE) else {
        return DEFAULT_HASH.to_owned();
    };

    store
    .get(STORE_KEY)
    .and_then(|value| value.as_str().map(str::to_owned))
    .filter(|hash| hash.starts_with('#'))
    .unwrap_or_else(|| DEFAULT_HASH.to_owned())
}

pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .invoke_handler(tauri::generate_handler![save_hash])
    .setup(|app| {
        let hash = stored_hash(&app.handle());

        let url = WebviewUrl::App(
            format!("calc.html{}", hash)
                .parse()
                .expect("valid app-relative URL"),
        );

        WebviewWindowBuilder::new(app, "main", url)
            .title("Factorio Calculator")
            .inner_size(1280.0, 800.0)
            .initialization_script(PERSISTENCE_SCRIPT)
            .build()?;

        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Factorio Calculator");
}
