FROM scratch
COPY ./target/release/severe-delays /app/severe-delays
WORKDIR /app
ENTRYPOINT ["/app/severe-delays"]
