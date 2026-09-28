"""AES-256 key for the sign-in challenge.

The vendor app derives this key as the SHA-256 digest of an application
constant that ships in its public package.
"""

CHALLENGE_KEY = bytes.fromhex(
    "e1eb55b8b8af94a16efebcce544f77fe1ca2268e1a31f157a2ee0cc7822a7159"
)
