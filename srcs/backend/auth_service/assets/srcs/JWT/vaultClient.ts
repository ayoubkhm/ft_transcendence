import vault = require('node-vault');

const VAULT_ADDR = process.env.VAULT_ADDR!;
const VAULT_TOKEN = process.env.VAULT_TOKEN!;

const VAULT_ROLE_NAME = 'myapp'; // Doit correspondre au rôle créé dans Vault

// Client Vault admin (root ou token avec droits pour lire AppRole)
const vaultClient = vault({
  endpoint: VAULT_ADDR,
  token: VAULT_TOKEN,
  apiVersion: 'v1',
});

// Type basique pour l’auth token info retourné par Vault
type VaultLoginResponse = {
  auth: {
    client_token: string;
    lease_duration: number;
    renewable: boolean;
  };
};

export async function getVaultClient() {
  try {
    // Récupération du role_id configuré dans Vault
    const roleIdResp = await vaultClient.read(`auth/approle/role/${VAULT_ROLE_NAME}/role-id`);
    if (!roleIdResp.data || !roleIdResp.data.role_id) {
      throw new Error('Impossible de récupérer role_id depuis Vault');
    }
    const role_id: string = roleIdResp.data.role_id;

    // Génération d’un secret_id pour l’AppRole
    const secretIdResp = await vaultClient.write(`auth/approle/role/${VAULT_ROLE_NAME}/secret-id`, {});
    if (!secretIdResp.data || !secretIdResp.data.secret_id) {
      throw new Error('Impossible de générer secret_id depuis Vault');
    }
    const secret_id: string = secretIdResp.data.secret_id;

    // Connexion avec AppRole (login) pour obtenir un token Vault
    const loginResp: VaultLoginResponse = await vaultClient.approleLogin({ role_id, secret_id });

    if (!loginResp.auth || !loginResp.auth.client_token) {
      throw new Error('Login AppRole a échoué, pas de token reçu');
    }

    // Création d’un client Vault authentifié avec ce token
    const clientWithToken = vault({
      endpoint: VAULT_ADDR,
      token: loginResp.auth.client_token,
      apiVersion: 'v1',
    });

    return clientWithToken;
  } catch (error) {
    console.error('Erreur lors de l\'authentification Vault AppRole:', error);
    throw error;
  }
}
