#!/bin/bash
set -e

# Nettoyage de l'ancien Vault
pkill vault || true
rm -rf /vault/data/*

# Démarrage de Vault en mode dev (pour dev/test uniquement)
echo "🚀 Démarrage de Vault en mode dev..."
vault server -dev -dev-root-token-id="root" -config=/vault/config/config.hcl > /tmp/vault.log 2>&1 &

sleep 5

export VAULT_TOKEN="root"
export VAULT_ADDR="http://127.0.0.1:8200"

# Activer AppRole auth method s’il n’est pas déjà activé
vault auth enable approle || echo "AppRole already enabled"

# Créer un AppRole 'myapp' avec les politiques adaptées (ajuste selon besoin)
vault write auth/approle/role/myapp token_policies="default" token_ttl=1h token_max_ttl=4h

# Récupérer le role_id
ROLE_ID=$(vault read -field=role_id auth/approle/role/myapp/role-id)

# Générer un secret_id
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/myapp/secret-id)

# Stocker role_id et secret_id dans un secret Vault dédié
vault kv put secret/approle/myapp role_id="$ROLE_ID" secret_id="$SECRET_ID"

echo "✅ AppRole créé et secrets stockés dans Vault"

# Génération et injection de la clé JWT (existant)
JWT_SECRET=$(openssl rand -hex 64)
vault kv put secret/jwt secret="$JWT_SECRET"

echo "✅ Clé JWT injectée dans Vault."

# Reste de l’injection des secrets…

# Affichage pour vérification
vault kv get secret/approle/myapp
vault kv get secret/jwt

wait
