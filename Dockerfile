FROM debian:latest
COPY ./target/release/severe-delays /app/severe-delays
EXPOSE 8000
WORKDIR /app
CMD ["/app/severe-delays"]
