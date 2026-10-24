# Main merge repair

Inspected main at b95dd3c137e0ec23d262cfaf12d92153597b786b. Its source mixed two incompatible weapon implementations: build produced 77 TypeScript errors and tests failed importing missing isWeaponId.

Reconciled runtime source and browser test script to the approved dev/weapon-discovery commit e49b47ca429cae9e59f66a9b1c86fcd0720ab7a6. Removed the competing weapon-art renderer. Retained Replit launch settings, repository ignore rules, Python test requirements and recorded game direction. Updated superseded weapon documentation.

This repair restores a single existing implementation; it does not change hammer timing, weapons, progression or presentation from the approved development build. Existing browser evidence remains applicable to those same runtime files. No new physical-device or hosted YouTube verification is claimed.

Validation commands and raw results: MAIN_REPAIR_RESULTS.txt. The Python browser script was restored for compatibility but not executed; the prior approved build's CUA browser checks are recorded in VALIDATION.md.
