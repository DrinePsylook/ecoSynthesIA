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