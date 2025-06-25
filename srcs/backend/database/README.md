# 📚 Base de données Transcendence

## Commandes disponibles pour la databases

Se fera update au fur et à mesure

Chaque table possède:
 * sa description
 * ses triggers (pour un certain event, généralement la creation d'un élément, un trigger lance une exception)
 * ses fonctions
 
---

### 🎮 Table `games`

```sql
• id : INTEGER généré automatiquement : unique

• p1_id : id du joueur 1, référence à `users(id)`, peut être NULL si bot ou user supprimé
• p2_id : pareil pour player 2
• p1_score : INTEGER, score du joueur 1 (NOT NULL, default 0)
• p2_score : INTEGER, score du joueur 2 (NOT NULL, default 0)
• p1_bot : BOOLEAN, true si p1 est un bot (NOT NULL, default false)
• p2_bot : BOOLEAN, true si p2 est un bot (NOT NULL, default false)

• state game_state : ENUM, peut être 'WAITING', 'RUNNING', 'PAUSE', ou 'OVER' (NOT NULL, default 'RUNNING')
• state game_type : ENUM, peut être 'IA', 'TOURNAMENT', ou 'VS' (NOT NULL)

• created_at : TIMESTAMP (default CURRENT_TIMESTAMP)
```

### 🔁 Triggers pour `games`
  * refuse 
  * refuse un oauth avec mot de passe ou sans email
  * refuse un guest avec email ou mot de passe


### 🎮 Fonctions pour `games`

```sql
Rien pour le moment
```

---

### 👤 Table `users`

```sql
• id : int généré automatiquement : unique
• name : TEXT, unique, non null
• type : 'guest', 'signed' ou 'oauth'
• admin : BOOLEAN (default false)
• email : TEXT, unique (null si guest)
• password : TEXT (null si guest ou oauth)
• created_at : TIMESTAMP (default now())
```

### 🔁 Triggers pour `users`
  * refuse la création d’un signed sans email ou mot de passe
  * refuse un oauth avec mot de passe ou sans email
  * refuse un guest avec email ou mot de passe

### ⚙️ Fonctions sur `users`

```sql
new_user(name, type, email, password)
→ return [ [] ]

update_user_email(id, email)
→ modifie l’email d’un user

update_user_name(id, name)
→ modifie le nom d’un user

update_user_password(id, password)
→ modifie le mot de passe d’un user

delete_user(id)
→ supprime l’utilisateur

get_user(id)
→ renvoie les infos utilisateur (succès, message, name, type, email, password, created_at)
```

---

### 🏆 Table `tournaments`

```sql
TABLE tournaments contient :
• id : SERIAL, clé primaire
• name : TEXT, unique, non null
• nbr_players : INT non null
• remaining_rounds : INT non null
• state : ENUM 'WAITING', 'RUNNING', 'OVER', default 'WAITING'
```

### 🔁 Triggers pour `tournaments`

* `enforce_tournament_constraints` :

  * interdit un nombre de rounds négatif

### ⚙️ Fonctions sur `tournaments`

```sql
new_tournament(name, nbr_players, tournament_state)
→ crée un tournoi en calculant les rounds avec CEIL(LOG(2, nbr_players))
→ gère les erreurs de nom dupliqué
```

---

**🔐 Accès**
Toutes les tables sont accessibles en lecture/écriture au rôle `$DB_USER`.

---

**🧰 Notes**

* Le hashage des mots de passe est TODO (`pgcrypto`)
* Le champ `admin` a été ajouté dans `users`, mais pas encore exploité
