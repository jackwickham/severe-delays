FROM debian:latest
COPY ./target/release/severe-delays /app/severe-delays
WORKDIR /app
CMD ["/app/severe-delays"]
