# Thoughtful choice for benchmarking

## Context and Model Selection

The goal is to benchmark three Small Language Models (SLMs) running locally on Ollama to identify the best trade-off between speed and accuracy for environmental data analysis.
**Models:** deepseek-r1, llama3.1, mistral.
**Local backend:** Ollama
**Language:** Pure Python Script

## Prompt Engineering Strategy
All prompts are written in English but instruct the model to output the summary in French. This leverages the superior reasoning and instruction-following abilities of LLMs in English (their primary training language) while still achieving the required output language.

**Text Summarization:** A system prompt sets the AI's role ("environmental analyst") and constraints (concise, factual, max 200 words).
**Data Extraction:** A strict JSON output format with an explicit example (few-shot prompting) is used to force the model into generating structured data (crucial for data visualization). The prompt is enhanced with explicit definitions of Chart types (Line, Bar, Pie, Choropleth) to guide the model's metadata generation.
**Classification:** A comprehensive Taxonomy with keywords and definitions is embedded directly in the prompt. The model is constrained to output only the category name, ensuring the output is clean and directly usable for binary (correct/incorrect) evaluation.

## Metrics and Evaluation
Different output types require distinct evaluation metrics to measure both linguistic quality and data accuracy.

| Task | Metric | Justification (Why this Metric?) |
| :--- | :--- |
| Text Summarization | ROUGE (Recall-Oriented Understudy for Gisting Evaluation). | Measures the quality of overlap between the generated and reference summaries. ROUGE is the standard for summary evaluation. ROUGE-1 (word relevance), ROUGE-2 (phrase fluency), and ROUGE-L (structural coherence) are tracked via the F1-measure (balanced score). |
| Data Extraction | Precision, Recall, F1-Score. | Treats the extraction as a structured information retrieval task. The F1-Score is the primary metric, balancing: Precision (avoiding invented data) and Recall (capturing all necessary data). The evaluation process includes robust JSON parsing and key normalization (comparing only the normalized key, value, and unit tuples). |
| Classification | Accuracy (Simple). | Measures the ratio of correct classifications (1.0 or 0.0) against the reference category. Since the task requires choosing one fixed label, simple accuracy is the appropriate measure of predictive power. |


## Running the benchmark

1 - Run Ollama Server (in a separate terminal):

```python
    ollama serve
```
2 - Launch Benchmark Script (in the main terminal):
 
```python
    python app.py
```

3 - Accessing Results (**MLflow**) :
- Launch the server: In the terminal (/benchmarking directory), run:
```python
    mlflow ui
```
- Access the browser: Go to the address indicated (usually `http://localhost:5000`)
- Visualization: In the interface, be able to see your experiments, click on a "Run" (corresponding to a model), and find your files under the Artifacts tab.
