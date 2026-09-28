"""Constants for the SiiPet integration."""

from __future__ import annotations

from datetime import timedelta
from typing import Final

DOMAIN: Final = "siipet"

CONF_AUTH_METHOD: Final = "auth_method"
CONF_CLIENT_ID: Final = "client_id"
CONF_CODE: Final = "code"
CONF_EXPIRE_AT: Final = "expire_at"
CONF_TOKEN: Final = "token"
# The keys that an entry needs to sign in. Entries from version 0.0.1 have none.
SESSION_KEYS: Final = (CONF_TOKEN, CONF_EXPIRE_AT, CONF_CLIENT_ID)

AUTH_EMAIL: Final = "email"
AUTH_TOKEN: Final = "token"

MANUFACTURER: Final = "SiiPet"
CAT_MODEL: Final = "Cat"
UNKNOWN_CAT_ID: Final = "unknown"
UNKNOWN_CAT_NAME: Final = "Unknown cat"

UPDATE_INTERVAL: Final = timedelta(minutes=5)
SYNC_INTERVAL: Final = timedelta(hours=1)
PAST_DAY_INTERVAL: Final = timedelta(hours=1)
LABELS_INTERVAL: Final = timedelta(hours=24)
MIDNIGHT_GRACE: Final = timedelta(hours=1)
WINDOW_DAYS: Final = 7
