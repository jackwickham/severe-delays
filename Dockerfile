FROM debian:latest

RUN apt-get update && apt-get install -y ca-certificates openssl

COPY ./target/release/severe-delays /app/severe-delays
COPY ./fe/dist /app/fe/dist

EXPOSE 8000
WORKDIR /app
CMD ["/app/severe-delays"]
