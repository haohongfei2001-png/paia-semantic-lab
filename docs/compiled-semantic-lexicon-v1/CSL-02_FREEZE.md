# CSL-02 public DEV freeze

The development corpus is a separate 72-case public fixture: 54 single-label
requests in Chinese and English across all 18 domains, 12 no-evidence/ambiguous requests, and six
continuations. It is not the blind TEST and has no private records. Its exact
SHA-256 and the compiler index SHA-256 are in CSL-02_DEV_RESULT.json.

Exactly three global policies were compared on this DEV fixture. The selected
policy is specific_only (minimumWeight=3, margin=0.25) as the highest
precision of the three, but **none qualified** under the 0.95 assignment
constraint. It covered only **3 of 60** assignable DEV cases (5%), assigned
precision was 0.75, and macro recall was 3.70% across represented Topics.
The broader policies reached 35% and 31.67% coverage, at 65.63% and 63.33%
assigned precision. None is credible for the frozen public capability floor.

The selection is a frozen research candidate, not a claim of success. The
runtime, index and global policy must not change after TEST v1 is opened. The
poor DEV result predicts a CSL-03 FAIL, but the independent fresh blind TEST
is still needed to measure the failure classes under the preregistered gates.
If it fails, the one CSL-04 structural repair opportunity may improve generic
matching and collision policy, followed by fresh TEST v2. No TEST-v1 phrase
can be copied or used as a regression promotion case.

The shipped candidate is dependency-free JS with a 144 Topic full-catalog
scan, explicit DEFER and bounded context. CSL-05 resource certification is
conditional on public capability PASS.
