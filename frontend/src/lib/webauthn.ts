/**
 * WebAuthn FIDO2 Biometric Authentication Utilities (Touch ID, Face ID, Windows Hello).
 */

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the current client platform supports platform authenticators (Face ID, Touch ID, Windows Hello).
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Executes browser navigator.credentials.create() with server options
 */
export async function createBiometricCredential(serverOptions: any): Promise<any> {
  if (!window.PublicKeyCredential) {
    throw new Error("Biometric WebAuthn is not supported in this browser.");
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const publicKey: PublicKeyCredentialCreationOptions = {
    ...serverOptions,
    rp: {
      name: serverOptions.rp?.name || "BusinessOS AI",
      id: hostname,
    },
    challenge: base64UrlToBuffer(serverOptions.challenge),
    user: {
      ...serverOptions.user,
      id: new TextEncoder().encode(serverOptions.user.id),
    },
    excludeCredentials: (serverOptions.excludeCredentials || []).map((cred: any) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as any;
  if (!credential) {
    throw new Error("Biometric enrollment cancelled or failed.");
  }

  return {
    credential_id: credential.id,
    raw_id: bufferToBase64Url(credential.rawId),
    client_data_json: bufferToBase64Url(credential.response.clientDataJSON),
    attestation_object: credential.response.attestationObject
      ? bufferToBase64Url(credential.response.attestationObject)
      : null,
    transports: credential.response.getTransports ? credential.response.getTransports() : ["internal"],
  };
}

/**
 * Executes browser navigator.credentials.get() with server challenge
 */
export async function getBiometricAssertion(serverOptions: any): Promise<any> {
  if (!window.PublicKeyCredential) {
    throw new Error("Biometric WebAuthn is not supported in this browser.");
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const publicKey: PublicKeyCredentialRequestOptions = {
    ...serverOptions,
    rpId: hostname,
    challenge: base64UrlToBuffer(serverOptions.challenge),
    allowCredentials: (serverOptions.allowCredentials || []).map((cred: any) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
    })),
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as any;
  if (!assertion) {
    throw new Error("Biometric authentication cancelled.");
  }

  return {
    credential_id: assertion.id,
    client_data_json: bufferToBase64Url(assertion.response.clientDataJSON),
    authenticator_data: bufferToBase64Url(assertion.response.authenticatorData),
    signature: bufferToBase64Url(assertion.response.signature),
    user_handle: assertion.response.userHandle
      ? bufferToBase64Url(assertion.response.userHandle)
      : null,
  };
}
