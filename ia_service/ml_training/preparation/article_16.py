import pandas as pd
import textwrap

# --- Configuration (à adapter au besoin) ---
# Assurez-vous que ce chemin est correct (comme dans votre script dataset_preparation.py)
GUARDIAN_ARTICLES_INPUT = "../news_datasets/llm_batch_80.csv" 

# L'index qui a échoué dans votre log est 15 (Article 16/80)
TARGET_INDEX = 15

# --- Chargement et Extraction ---

# 1. Charger le DataFrame
try:
    df = pd.read_csv(GUARDIAN_ARTICLES_INPUT)
except FileNotFoundError:
    print(f"ERREUR : Le fichier {GUARDIAN_ARTICLES_INPUT} est introuvable. Vérifiez le chemin.")
    # On arrête le script ici si le fichier n'est pas trouvé
    exit()

# 2. Vérifier si l'index est valide
if TARGET_INDEX >= len(df):
    print(f"ERREUR : L'index cible {TARGET_INDEX} est hors limites du DataFrame (taille : {len(df)}).")
    exit()

# 3. Extraire le texte de l'article
# On utilise .loc pour garantir la lecture par index
article_row = df.loc[TARGET_INDEX]
article_text = article_row['Full Text']

# 4. Afficher l'ID/Titre si vous l'aviez, mais surtout le texte pour la lecture
print(f"--- ANALYSE DE L'ARTICLE N° {TARGET_INDEX + 1} (INDEX PYTHON {TARGET_INDEX}) ---")

# Affichage du texte : On utilise textwrap pour limiter la largeur et faciliter la lecture dans le notebook
wrapped_text = textwrap.fill(article_text, width=120)

print("\nTEXTE COMPLET BLOQUÉ PAR AZURE (Violence: Medium):\n")
print(wrapped_text)

# --- Labellisation Manuelle (Optionnelle) ---

# Déterminez manuellement la catégorie ici :
# [CLIMATE AND EMISSIONS, BIODIVERSITY AND ECOSYSTEMS, ..., RISKS AND DISASTERS]

MANUAL_CATEGORY = "VOTRE_CATÉGORIE_ICI" # Par exemple : RISKS AND DISASTERS

print(f"\n--- LABELLISATION MANUELLE PROPOSÉE : {MANUAL_CATEGORY} ---")