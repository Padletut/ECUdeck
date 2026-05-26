# Releases

This guide describes the release process and release-note standards for ECUDeck.

## Release Goals

Each release should be:

- reproducible
- understandable
- traceable
- explicit about risk and breaking changes

## Before a Release

Verify the relevant parts of the system:

- frontend build passes
- lint and typecheck pass
- native code checks pass where applicable
- docs are updated for user-facing or contributor-facing changes
- plugin contract changes are called out explicitly

## Release Notes Structure

Recommended release-note sections:

- Summary
- Added
- Changed
- Fixed
- Docs
- Breaking Changes
- Migration Notes

## Good Release Notes

Good notes answer:

- what changed
- who is affected
- whether migration is required
- whether plugin or contract compatibility changed
- whether known limitations remain

## Breaking Changes

Breaking changes should never be buried.

If a release changes:

- plugin contracts
- command contracts
- workspace/project expectations
- review behavior

those changes must be clearly labeled.

## Version Discipline

If a release changes a public contract, the versioning and migration story should reflect that fact.
