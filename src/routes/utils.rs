use rocket::Route;

pub fn get_routes() -> Vec<Route> {
    routes![options]
}

/// Empty handler for OPTIONS requests to send CORS headers
#[options("/<_..>")]
fn options() {}
