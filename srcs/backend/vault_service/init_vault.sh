#!/bin/bash
set -e

# Nettoyage éventuel
pkill vault || true
rm -rf /vault/data/*

# Export des variables d'environnement pour Vault CLI
export VAULT_TOKEN="root"
export VAULT_ADDR="http://vault:8200"

# Lancer Vault en mode dev en arrière-plan + redirection des logs
echo "🚀 Démarrage de Vault en mode dev..."
vault server -dev -dev-root-token-id="root" > /tmp/vault.log 2>&1 &
VAULT_PID=$!

# Attente de l’init de Vault
echo "⏳ Attente du démarrage de Vault..."
MAX_RETRIES=15
for ((i=1; i<=MAX_RETRIES; i++)); do
  if vault status &>/dev/null; then
    echo "✅ Vault est prêt (tentative $i)"
    break
  else
    echo "⌛ Tentative $i/$MAX_RETRIES : Vault pas encore prêt..."
    sleep 1
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "❌ Vault ne s'est pas lancé correctement."
    echo "📄 Logs Vault :"
    tail -n 20 /tmp/vault.log
    kill $VAULT_PID || true
    exit 1
  fi
done

# Activer AppRole s'il n’est pas déjà actif
vault auth enable approle || echo "ℹ️ AppRole déjà activé"

# Créer AppRole "myapp"
vault write auth/approle/role/myapp \
  token_policies="default" \
  token_ttl=1h \
  token_max_ttl=4h

# Récupérer role_id et secret_id
ROLE_ID=$(vault read -field=role_id auth/approle/role/myapp/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/myapp/secret-id)

# Stocker dans Vault
vault kv put secret/approle/myapp role_id="$ROLE_ID" secret_id="$SECRET_ID"
echo "✅ AppRole configuré et stocké"

# Générer une clé JWT
JWT_SECRET=$(openssl rand -hex 64)
vault kv put secret/jwt secret="$JWT_SECRET"
echo "✅ Clé JWT générée et injectée"

# Vérification
vault kv get secret/approle/myapp
vault kv get secret/jwt

# Attendre Vault pour bloquer le script (optionnel mais utile)
wait $VAULT_PID
