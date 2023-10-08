FROM scratch
COPY ./target/release/severe-delays /app/severe-delays
WORKDIR /app
CMD ["./severe-delays"]
