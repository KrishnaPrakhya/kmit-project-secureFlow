# AI-Powered Prompt-Based Redaction

## Overview

This feature allows users to redact sensitive information from documents using **natural language** instead of selecting entity types manually. Simply describe what you want to redact (e.g., "Remove all personal information but keep job titles"), and the AI will intelligently identify and redact the appropriate content.

## Features

### 🎯 Natural Language Intent

- Describe your redaction needs in plain English
- AI understands context and nuance
- No need to know technical entity types

### 🧠 Intelligent Analysis

- **Dual-Engine Approach**: Combines LangChain LLM + GLiNER for maximum accuracy
- **Context-Aware**: Understands relationships between entities
- **Confidence Scoring**: Each entity has a confidence score (High/Medium/Low)

### 🔄 Interactive Refinement

- Preview redaction before applying
- Provide additional feedback to refine results
- Iterative improvement of redaction plan

### 📊 Multiple Strategies

- **BlackOut**: Complete removal (for highly sensitive data)
- **Blur**: Obscure content while hinting at its presence
- **CategoryReplacement**: Replace with category labels
- **Vanishing**: Remove without trace

## Architecture

```
┌─────────────────┐
│   User Input    │
│  (Natural Lang) │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   LangChain     │──► Intent Analysis
│  Gemini 1.5 Pro │──► Entity Extraction
│                 │──► Strategy Selection
└────────┬────────┘
         │
         v
┌─────────────────┐
│     GLiNER      │──► Pattern Matching
│  (Verification) │──► Additional Entities
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Refinement     │──► User Feedback
│     Engine      │──► Iterative Improvement
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Redaction     │──► Apply to Document
│   Execution     │──► Generate Output
└─────────────────┘
```

## Installation

### 1. Install Python Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Google API key
GOOGLE_API_KEY=your_actual_api_key_here
```

Get your Google API key from: https://makersuite.google.com/app/apikey

### 3. Verify Installation

```bash
python -c "from prompt_redaction import analyze_intent; print('✓ Installation successful')"
```

## API Endpoints

### 1. Analyze Intent

**POST** `/api/promptRedaction/analyze`

Analyzes the document based on user's natural language intent.

**Request:**

```typescript
FormData {
  file: File,
  intent: string,
  min_confidence?: number (default: 0.7)
}
```

**Response:**

```json
{
  "message": "Intent analysis completed successfully",
  "intent": "Remove all personal information",
  "entities": [
    {
      "text": "John Smith",
      "label": "PERSON_NAME",
      "reason": "Personal identifier",
      "confidence": 0.95
    }
  ],
  "redaction_strategy": "BlackOut",
  "summary": "Redacting all personal identifiers...",
  "total_entities": 5
}
```

### 2. Refine Plan

**POST** `/api/promptRedaction/refine`

Refines the redaction plan based on additional user feedback.

**Request:**

```json
{
  "current_plan": {
    /* RedactionPlan object */
  },
  "feedback": "Also remove job titles"
}
```

### 3. Generate Preview

**POST** `/api/promptRedaction/preview`

Generates HTML preview with highlighted entities.

**Request:**

```json
{
  "text": "Document text...",
  "entities": [
    /* entities array */
  ]
}
```

### 4. Execute Redaction

**POST** `/api/promptRedaction/execute`

Executes the redaction on the document.

**Request:**

```typescript
FormData {
  file: File,
  entities: string (JSON),
  type: "BlackOut" | "Blur" | "CategoryReplacement" | "Vanishing"
}
```

## Usage Examples

### Example 1: Simple Personal Information Removal

**User Intent:**

```
"Remove all personal information"
```

**What Gets Redacted:**

- Names
- Email addresses
- Phone numbers
- Physical addresses
- Dates of birth

### Example 2: Selective Financial Redaction

**User Intent:**

```
"Hide all financial information but keep names and job titles"
```

**What Gets Redacted:**

- Account numbers
- Credit card numbers
- Bank names
- Salary information
- Transaction amounts

**What's Preserved:**

- Person names
- Job titles
- Company names

### Example 3: Contact Information Only

**User Intent:**

```
"Remove only contact details like emails and phone numbers"
```

**What Gets Redacted:**

- Email addresses
- Phone numbers
- Fax numbers

**What's Preserved:**

- Everything else (names, addresses, dates, etc.)

### Example 4: Custom Business Logic

**User Intent:**

```
"Redact all information about employees but keep information about customers"
```

The AI will:

1. Identify employee-related information
2. Identify customer-related information
3. Redact only employee data
4. Preserve customer data

## Advanced Features

### Confidence-Based Filtering

You can filter entities by confidence threshold:

```python
from prompt_redaction import filter_by_confidence

# Only keep high-confidence entities (≥0.85)
filtered_plan = filter_by_confidence(plan, min_confidence=0.85)
```

### Context Retrieval

Get surrounding context for any entity:

```python
from prompt_redaction import get_context_around_entity

context = get_context_around_entity(
    text=document_text,
    entity_text="John Smith",
    context_chars=100
)
```

### Interactive Refinement

Users can iteratively improve the redaction plan:

```python
# Initial analysis
plan = analyze_intent("Remove personal info", document)

# User provides feedback
refined_plan = interactive_refinement(
    plan,
    "Also remove job titles and keep company names"
)
```

## Best Practices

### 1. Be Specific with Intent

❌ **Vague:** "Remove sensitive information"
✅ **Specific:** "Remove all personal identifiers including names, emails, and phone numbers, but keep job titles and company names"

### 2. Use Preview Before Execution

Always generate and review the preview to ensure the AI understood your intent correctly.

### 3. Iterate with Feedback

If the initial results aren't perfect, use the refinement feature rather than starting over.

### 4. Adjust Confidence Threshold

- **High threshold (0.85-1.0)**: More conservative, fewer false positives
- **Medium threshold (0.7-0.84)**: Balanced approach
- **Low threshold (0.5-0.69)**: More aggressive, catches more entities but may have false positives

### 5. Combine with Manual Review

For critical documents, review the entity list before executing the redaction.

## Customization

### Adding Custom Entity Types

Edit `prompt_redaction.py`:

```python
ENTITY_TYPES = [
    # ... existing types ...
    "YOUR_CUSTOM_TYPE",
    "ANOTHER_CUSTOM_TYPE"
]
```

### Modifying Prompt Templates

The system uses few-shot learning. Add more examples in `EXAMPLE_PROMPTS`:

```python
EXAMPLE_PROMPTS = [
    # ... existing examples ...
    {
        "user_intent": "Your custom intent",
        "document_text": "Sample document text",
        "output": "Expected JSON output"
    }
]
```

### Changing LLM Model

Switch to a different model:

```python
def get_llm():
    # Use GPT-4 instead
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model="gpt-4-turbo-preview",
        temperature=0.1,
        api_key=os.getenv('OPENAI_API_KEY')
    )
```

## Performance Optimization

### 1. Batch Processing

For multiple documents:

```python
results = []
for doc in documents:
    plan = analyze_intent(intent, doc.text)
    results.append(plan)
```

### 2. Caching

Cache frequently used intents:

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_analyze(intent_hash, document_hash):
    return analyze_intent(intent, document)
```

### 3. Async Processing

For large documents, use async:

```python
import asyncio

async def process_documents(documents):
    tasks = [analyze_intent_async(intent, doc) for doc in documents]
    return await asyncio.gather(*tasks)
```

## Troubleshooting

### Issue: "GOOGLE_API_KEY not found"

**Solution:** Ensure `.env` file exists in `server/` directory with valid API key:

```bash
echo "GOOGLE_API_KEY=your_key_here" > server/.env
```

### Issue: Low accuracy in entity detection

**Solutions:**

1. Be more specific in your intent description
2. Lower the confidence threshold
3. Use the refinement feature
4. Add more examples to the prompt template

### Issue: Slow performance

**Solutions:**

1. Use a smaller document or split large documents
2. Increase `min_confidence` to reduce entities
3. Consider using a faster LLM model
4. Enable caching for repeated intents

### Issue: Entities not being detected

**Solutions:**

1. Check if entity type is in `ENTITY_TYPES` list
2. Add custom examples for your domain
3. Verify text extraction quality
4. Try lowering confidence threshold

## Security Considerations

1. **API Key Protection**: Never commit `.env` file to version control
2. **Data Privacy**: Document text is sent to Google's API - ensure compliance with data policies
3. **Output Verification**: Always review redacted output before sharing
4. **Access Control**: Implement authentication for the API endpoints
5. **Audit Logging**: Log all redaction requests for compliance

## Future Enhancements

- [ ] Support for multiple languages
- [ ] Custom training for domain-specific entities
- [ ] Batch processing UI
- [ ] Redaction history and rollback
- [ ] Integration with document management systems
- [ ] PDF annotation preservation
- [ ] OCR quality improvement
- [ ] Real-time collaboration
- [ ] Version control for redacted documents
- [ ] Compliance reporting

## License

Part of the Automated-Redaction project.

## Support

For issues or questions, please open an issue on GitHub or contact the development team.
