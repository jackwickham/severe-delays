# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The repository is made up of:

- frontend code, using typescript + SolidJS, in the `fe` dir
- backend code, using Rust + Rocket, in the root of the repository

## Build Commands

- Backend: `cargo build` (build), `cargo run` (run server)
- Frontend: `cd fe && npm run dev`

## Test Commands

- Backend: `cargo test` (run all tests), `cargo test <test_name>` (single test)
- Frontend: Currently no testing framework configured

## Lint/Format Commands

- Backend: `cargo fmt` (format code)
- Frontend: `cd fe && npm run format` (format with Prettier), `npm run check` (type check)

## Code Style Guidelines

- **Rust**: Snake_case for variables/functions, CamelCase for types
- **TypeScript**: 2-space indent, 100 char line width, double quotes
- **Imports**: Group by origin (standard lib, external, internal)
- **Types**: Use explicit type definitions, avoid `any`
- **Error Handling**: Custom error enums in Rust, try/catch in TypeScript
- **Component Structure**: Feature folders with index.ts exports
- **Comments**: Comments should be used for non-trivial code, to explain why it is like that. It should only describe the behaviour in particularly complex cases where the behaviour is not easy to understand from reading the code.
