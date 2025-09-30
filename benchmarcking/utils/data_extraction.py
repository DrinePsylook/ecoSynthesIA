import json
import os 

from PyPDF2 import PdfReader 

# Configuration and datas loading
REPORTS_DIR = "reports"
REFERENCE_FILE = 'references_data.JSON'

def load_references_titles():
    """
    Extracts and returns the titles of all reports in the REPORTS_DIR directory, from REFERENCE_FILE.
    """
    try:
        with open(REFERENCE_FILE, 'r', encoding='utf-8') as file:
            data = json.load(file)
    except Exception as e:
        print(f"Error reading {REFERENCE_FILE}: {e}")
        return []
    
    document_titles = []

    if "documents" in data and isinstance(data['documents'], list):
        for doc in data['documents']:
            # Creating the full path to the report
            report_file_name = doc['title']
            doc['file_path'] = os.path.join(REPORTS_DIR, report_file_name)

            document_titles.append(doc)
        
        print(f"Extracted {len(document_titles)} document titles from reference.")
        for doc in document_titles:
            print(f"- ID: {doc['id']}, Titre: {doc['title']}, Chemin: {doc['file_path']}")

        return document_titles
    else:
        print("No documents found in the reference file.")
        return []
    
def extract_text_from_report(file_path):
    """
    Extract the text from all report to send to the LLM.
    """
    if not os.path.exists(file_path):
        print(f"Warning: the file {file_path} does not exist!")
        return None
    
    # Using PyPDF2 to extract text from PDF
    try:
        reader = PdfReader(file_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text = f"\n---PAGE {i+1}---\n"
                text += page_text

        if len(text.strip()) < 100:
            print(f"Warning: Extracted text from {file_path} seems very short ({len(text)} characters). Check the PDF content or extraction method.")
            return None
        
        return text
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return None