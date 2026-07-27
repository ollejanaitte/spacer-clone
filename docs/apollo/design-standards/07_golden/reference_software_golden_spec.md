# Reference Software Golden Specification — DS-07

## Evidence bundle

A `REFERENCE_SOFTWARE_GOLDEN` bundle must contain:

- product, module, version, build, executable/service checksum, and permitted license evidence;
- native input and output files, settings, run procedure, locale, units, coordinate/sign/I-J rules;
- raw stdout/stderr/error/license observables where applicable;
- SHA-256 manifest for every retained artifact;
- three isolated runs with an approved normalization rule for variable metadata;
- comparison-ready internal-precision values, not only rounded reports or screenshots;
- independent approval and a source-to-expected lineage record.

SPACER and historical Analyzer machine evidence is blocked by DS-06. The SPACER manual and example
CSV layout are `REFERENCE_ONLY`; they cannot establish a Golden value or product version.

## Failure handling

License failure, timeout, cancellation, malformed input, partial output, stale output, or unsupported
feature is never a successful reference Golden. Such evidence may support a `NEGATIVE_GOLDEN` only
when the expected failure contract is independently specified and the artifact cannot be mistaken
for a successful result.
