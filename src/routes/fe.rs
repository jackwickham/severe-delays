use rocket::fs::NamedFile;
use rocket::http::Header;
use rocket::response::Responder;
use std::path::{Path, PathBuf};

pub fn get_routes() -> Vec<rocket::Route> {
    routes![dist, assets]
}

struct CacheImmutably<R> {
    inner: R,
}

impl<R> CacheImmutably<R> {
    fn wrap(inner: R) -> Self {
        Self { inner }
    }
}

impl<'r, 'o: 'r, R: Responder<'r, 'o>> Responder<'r, 'o> for CacheImmutably<R> {
    fn respond_to(self, request: &'r rocket::Request<'_>) -> rocket::response::Result<'o> {
        let mut response = self.inner.respond_to(request)?;
        response.set_header(Header::new(
            "Cache-Control",
            "max-age=31536000, public, immutable",
        ));
        Ok(response)
    }
}

#[get("/<path..>")]
async fn dist(path: PathBuf) -> Option<NamedFile> {
    let mut resolved_path = Path::new("fe/dist").join(path).to_path_buf();
    if resolved_path.is_dir() {
        resolved_path.push("index.html");
    }
    NamedFile::open(resolved_path).await.ok()
}

#[get("/assets/<path..>")]
async fn assets(path: PathBuf) -> Option<CacheImmutably<NamedFile>> {
    let mut resolved_path = Path::new("fe/dist/assets").join(path).to_path_buf();
    if resolved_path.is_dir() {
        resolved_path.push("index.html");
    }

    Some(CacheImmutably::wrap(
        NamedFile::open(resolved_path).await.ok()?,
    ))
}
