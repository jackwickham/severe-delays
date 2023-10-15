use rocket::{
    fairing::{Fairing, Info, Kind},
    http::Header,
    Request, Response,
};

use crate::config::Config;

pub struct CorsFairing;

#[rocket::async_trait]
impl Fairing for CorsFairing {
    fn info(&self) -> Info {
        Info {
            name: "Cross-Origin-Resource-Sharing Fairing",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        if let Some(origin) = request.headers().get_one("origin") {
            let allowed_origins = &request.rocket().state::<Config>().unwrap().cors_origins;
            let origin_allowed = allowed_origins
                .iter()
                .any(|allowed_origin| allowed_origin == origin);
            if origin_allowed {
                response.set_header(Header::new("Access-Control-Allow-Origin", origin));
                response.set_header(Header::new(
                    "Access-Control-Allow-Methods",
                    "POST, PATCH, PUT, DELETE, HEAD, OPTIONS, GET",
                ));
            } else {
                log::warn!(
                    "Cors request from disallowed origin {} (allowed origins: {:?})",
                    origin,
                    allowed_origins,
                );
            }
        }
    }
}
