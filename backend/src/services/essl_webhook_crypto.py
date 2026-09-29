"""eBioServerNew webhook AES-256-CBC decryption.

The supplied eBioServerNew Web Hook manual specifies AES, CBC mode and a
256-bit key. It does not document the IV in the supplied pages. Configure the
actual IV used by the eBioServer installation through ESSL_WEBHOOK_AES_IV.
"""
from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def _key(password: str) -> bytes:
    raw = (password or "").encode("utf-8")
    if len(raw) == 32:
        return raw
    if len(raw) < 32:
        # Matches the padding example in the supplied manual: essl1234 becomes
        # essl1234 + 24 '1' characters.
        return raw.ljust(32, b"1")
    return raw[:32]


def _iv() -> bytes:
    value = os.getenv("ESSL_WEBHOOK_AES_IV", "")
    if not value:
        raise ValueError(
            "ESSL_WEBHOOK_AES_IV is required because the supplied eBioServer "
            "manual specifies AES-256-CBC but does not specify an IV."
        )
    raw = value.encode("utf-8")
    if len(raw) != 16:
        raise ValueError("ESSL_WEBHOOK_AES_IV must be exactly 16 UTF-8 bytes")
    return raw


def pkcs7_unpad(data: bytes) -> bytes:
    if not data:
        raise ValueError("Invalid AES padding: empty plaintext")
    pad = data[-1]
    if pad < 1 or pad > 16 or data[-pad:] != bytes([pad]) * pad:
        raise ValueError("Invalid AES padding")
    return data[:-pad]


def decrypt_ebioserver_webhook_data(ciphertext_b64: str) -> str:
    if not ciphertext_b64:
        raise ValueError("Encrypted webhook data is empty")
    try:
        ciphertext = base64.b64decode(ciphertext_b64, validate=True)
    except Exception as exc:
        raise ValueError("Webhook data is not valid Base64") from exc
    if not ciphertext or len(ciphertext) % 16:
        raise ValueError("AES ciphertext length must be a positive multiple of 16")

    cipher = Cipher(algorithms.AES(_key(os.getenv("ESSL_WEBHOOK_AES_PASSWORD", ""))), modes.CBC(_iv()))
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    return pkcs7_unpad(plaintext).decode("utf-8")
