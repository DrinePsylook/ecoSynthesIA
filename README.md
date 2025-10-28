# Description du Projet

**EcoSynthesIA** est une application web conçue pour transformer de grands volumes de rapports scientifiques et institutionnels en informations claires et exploitables. L'objectif est de fournir aux ONG, journalistes et chercheurs un outil intelligent pour synthétiser des données complexes, facilitant ainsi la prise de conscience et l'action sur les enjeux écologiques majeurs.

### Fonctionnalités Clés

**Synthèse intelligente :** Utilisation d'un modèle de langage pré-entraîné pour générer des résumés concis et pertinents de longs documents.

**Extraction de données :** Un modèle d'IA personnalisé pour identifier et extraire des données chiffrées (émissions, surfaces déforestées, etc.) et des entités nommées clés.

**Visualisation interactive :** Transformation des données extraites en tableaux de bord et graphiques pour une compréhension rapide.

**Vérifiabilité :** Chaque information extraite est liée à sa source dans le document original, garantissant la fiabilité des analyses.

**Pipeline de données automatisé :** Système de collecte et de traitement récurrent des nouveaux documents provenant de sources publiques.

### Architecture Technique

Le projet suit une architecture modulaire pour une maintenance et un déploiement facilités.

**Frontend :** Développé avec TypeScript pour une interface utilisateur réactive et fiable.

**Backend :** Construit avec Node.js pour orchestrer les requêtes de l'application, la gestion des documents et la communication avec le service d'IA. La base de données est gérée avec PostgreSQL et SQLAlchemy pour des migrations versionnées.

**Moteur d'IA :** La logique d'IA est centralisée dans un service indépendant, utilisant LangChain et LangGraph pour orchestrer les chaînes de traitement (résumé, extraction, etc.).

**Stockage :** Un système de stockage (simulé par un dossier local pour la démonstration) gère les documents source.

**Benchmarking d'IA :** Evaluation du meilleur SLM (deepseek-r1, llama3.1 ou mistral) pour le résumé, l'extraction de données et la classification qui permettra de crée un dataset de test pour le modèle Machine Learning de classification

## Lancer l'application ecoSynthesIA avec Docker

Pour démarrer l'environnement complet (Base de données PostgreSQL, Serveur Backend, et Interface Utilisateur), vous n'avez besoin que d'une seule commande.

### ⚙️ Pré-requis

Assurez-vous d'avoir :
1. Docker Desktop ou Docker Engine en cours d'exécution.
2. Un fichier .env complété à la racine.

### 1. Démarrage de l'Environnement

Exécutez cette commande dans un seul terminal à la racine du projet. Elle va construire les images et lancer tous les services en arrière-plan :

```bash
docker-compose up -d --build
```

## Commandes yarn du Backend

Ces commandes s'exécutent idéalement à l'intérieur du dossier backend pour garantir l'accès aux dépendances et à la base de données PostgreSQL.

```bash
yarn install
```
Installe toutes les dépendances listées dans package.json.

```bash
yarn dev
```
Lance le serveur Backend en mode développement avec nodemon. Exécute les migrations en local et redémarre automatiquement en cas de modification des fichiers sources.

```bash
yarn build
```
Compile le code TypeScript (.ts) vers JavaScript (.js) dans le répertoire de sortie (dist/).

```bash
yarn seed:db
```
Exécute le pipeline d'extraction et d'insertion des documents de la Banque Mondiale.