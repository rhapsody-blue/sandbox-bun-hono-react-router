import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'task-app',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'task-web',
});

let initialization: Promise<boolean> | undefined;

export function initializeKeycloak() {
  if (!initialization) {
    initialization = keycloak
      .init({
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .catch((error: unknown) => {
        initialization = undefined;
        throw error;
      });
  }

  return initialization;
}

export function loginToKeycloak() {
  return keycloak.login({ redirectUri: window.location.href });
}

export async function getAccessToken() {
  if (!keycloak.authenticated) {
    return undefined;
  }

  await keycloak.updateToken(30);
  return keycloak.token ?? undefined;
}

export function getAuthenticatedUsername() {
  return keycloak.tokenParsed?.preferred_username ?? keycloak.tokenParsed?.name;
}

export function logoutFromKeycloak() {
  return keycloak.logout({ redirectUri: window.location.origin });
}
