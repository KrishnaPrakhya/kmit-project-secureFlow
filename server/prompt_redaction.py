"""
Prompt-based Redaction System using LangChain
This module implements intelligent, intent-based redaction using LLMs
"""

from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import re
import os

# Initialize Gemini LLM
def get_llm():
    """Initialize and return the LLM"""
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.1,  # Low temperature for consistent results
        google_api_key=api_key
    )

# Pydantic models for structured output
class RedactionEntity(BaseModel):
    """Model for a single entity to redact"""
    text: str = Field(description="The exact text to redact from the document")
    entity_type: str = Field(description="The type/category of the entity (e.g., PERSON_NAME, EMAIL)")
    reason: str = Field(description="Why this should be redacted based on user intent")
    confidence: float = Field(description="Confidence score between 0 and 1")

class RedactionPlan(BaseModel):
    """Complete redaction plan based on user intent"""
    entities: List[RedactionEntity] = Field(description="List of entities to redact")
    redaction_strategy: str = Field(description="Recommended redaction strategy (BlackOut, Blur, CategoryReplacement)")
    summary: str = Field(description="Summary of what will be redacted and why")

# Few-shot examples for better accuracy
EXAMPLE_PROMPTS = [
    {
        "user_intent": "Remove all personal information",
        "document_text": "John Smith lives at 123 Main St. His email is john@example.com and phone is 555-1234.",
        "output": """{
            "entities": [
                {"text": "John Smith", "entity_type": "PERSON_NAME", "reason": "Personal identifier", "confidence": 0.95},
                {"text": "123 Main St", "entity_type": "ADDRESS", "reason": "Personal address", "confidence": 0.90},
                {"text": "john@example.com", "entity_type": "EMAIL", "reason": "Personal contact", "confidence": 0.95},
                {"text": "555-1234", "entity_type": "PHONE", "reason": "Personal contact", "confidence": 0.90}
            ],
            "redaction_strategy": "BlackOut",
            "summary": "Redacting all personal identifiers including name, address, and contact information"
        }"""
    },
    {
        "user_intent": "Hide financial information but keep names",
        "document_text": "Jane Doe's account number is 1234567890 with balance $50,000. Her PAN is ABCDE1234F.",
        "output": """{
            "entities": [
                {"text": "1234567890", "entity_type": "ACCOUNT_NUMBER", "reason": "Financial account information", "confidence": 0.95},
                {"text": "$50,000", "entity_type": "AMOUNT", "reason": "Financial balance", "confidence": 0.90},
                {"text": "ABCDE1234F", "entity_type": "PAN_NUMBER", "reason": "Tax identification", "confidence": 0.95}
            ],
            "redaction_strategy": "CategoryReplacement",
            "summary": "Redacting financial data (account numbers, balances, PAN) while preserving identity information"
        }"""
    },
    {
        "user_intent": "Remove contact details only",
        "document_text": "Contact Sarah at sarah@company.com or call 555-9999. Office: Suite 400, Tech Park.",
        "output": """{
            "entities": [
                {"text": "sarah@company.com", "entity_type": "EMAIL", "reason": "Email contact", "confidence": 0.95},
                {"text": "555-9999", "entity_type": "PHONE", "reason": "Phone contact", "confidence": 0.90}
            ],
            "redaction_strategy": "Blur",
            "summary": "Redacting only direct contact methods (email and phone) while keeping names and office locations"
        }"""
    }
]

# Create the prompt template
def create_prompt_template():
    """Create the main prompt template for intent-based redaction"""
    
    # Example formatter
    example_prompt = ChatPromptTemplate.from_messages([
        ("human", "User Intent: {user_intent}\nDocument Text: {document_text}"),
        ("ai", "{output}")
    ])
    
    few_shot_prompt = FewShotChatMessagePromptTemplate(
        example_prompt=example_prompt,
        examples=EXAMPLE_PROMPTS,
    )
    
    # Main prompt
    main_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert redaction system that understands user intent and identifies sensitive information in documents.

Your task is to:
1. Analyze the user's redaction intent (what they want to hide/protect)
2. Identify ALL text spans in the document that match this intent
3. Determine the entity type for each span
4. Explain WHY each item should be redacted based on the user's intent
5. Recommend the best redaction strategy

Important guidelines:
- Be PRECISE: Extract the EXACT text as it appears in the document
- Be COMPREHENSIVE: Don't miss any entities that match the intent
- Be CONTEXTUAL: Consider the user's specific intent, not just entity types
- Confidence should reflect how certain you are this matches the user's intent
- For ambiguous cases, include them with lower confidence scores

Available entity types: {entity_types}

Redaction strategies:
- BlackOut: Complete removal (for highly sensitive data)
- Blur: Obscure but hint at content (for moderately sensitive)
- CategoryReplacement: Replace with category label (for structured data)
- Vanishing: Remove without trace (for clean documents)

Return your response as valid JSON matching this schema:
{format_instructions}"""),
        few_shot_prompt,
        ("human", "User Intent: {user_intent}\n\nDocument Text:\n{document_text}\n\nIdentify what should be redacted:"),
    ])
    
    return main_prompt

# Entity types available
ENTITY_TYPES = [
    "PERSON_NAME", "EMAIL_ADDRESS", "PHONE_NUMBER", "ADDRESS", "DATE_OF_BIRTH",
    "SSN", "PASSPORT_NUMBER", "DRIVERS_LICENSE", "CREDIT_CARD", "BANK_ACCOUNT",
    "PAN_NUMBER", "AADHAR_NUMBER", "MEDICAL_RECORD", "IP_ADDRESS", "URL",
    "ORGANIZATION", "FINANCIAL_AMOUNT", "SALARY", "AGE", "GENDER",
    "QUALIFICATION", "COMPANY_NAME", "JOB_TITLE", "PROJECT_NAME",
    "CONFIDENTIAL_INFO", "TRADE_SECRET", "INTERNAL_CODE", "PASSWORD"
]

def analyze_intent(user_intent: str, document_text: str) -> RedactionPlan:
    """
    Main function to analyze user intent and generate redaction plan
    
    Args:
        user_intent: User's description of what they want to redact
        document_text: The actual document text to analyze
        
    Returns:
        RedactionPlan with entities to redact and strategy
    """
    
    # Initialize LLM and parser
    llm = get_llm()
    parser = PydanticOutputParser(pydantic_object=RedactionPlan)
    
    # Create prompt
    prompt = create_prompt_template()
    
    # Create chain
    chain = prompt | llm | parser
    
    # Execute
    try:
        result = chain.invoke({
            "user_intent": user_intent,
            "document_text": document_text,
            "entity_types": ", ".join(ENTITY_TYPES),
            "format_instructions": parser.get_format_instructions()
        })
        return result
    except Exception as e:
        print(f"Error in intent analysis: {str(e)}")
        raise

def refine_with_gliner(redaction_plan: RedactionPlan, gliner_entities: List[Dict]) -> RedactionPlan:
    """
    Refine the LLM-generated plan with GLiNER results for better accuracy
    
    Args:
        redaction_plan: Initial plan from LLM
        gliner_entities: Entities detected by GLiNER model
        
    Returns:
        Refined RedactionPlan
    """
    
    # Create a set of texts from LLM plan
    llm_texts = {entity.text.lower().strip() for entity in redaction_plan.entities}
    
    # Add high-confidence GLiNER entities that weren't in LLM plan
    additional_entities = []
    for gliner_entity in gliner_entities:
        text = gliner_entity['text'].lower().strip()
        if text not in llm_texts:
            # Add with slightly lower confidence since LLM didn't catch it
            additional_entities.append(RedactionEntity(
                text=gliner_entity['text'],
                entity_type=gliner_entity['label'],
                reason="Detected by pattern matching as potential sensitive data",
                confidence=0.75
            ))
    
    # Combine and sort by confidence
    all_entities = redaction_plan.entities + additional_entities
    all_entities.sort(key=lambda x: x.confidence, reverse=True)
    
    # Update plan
    redaction_plan.entities = all_entities
    if additional_entities:
        redaction_plan.summary += f" Additionally found {len(additional_entities)} entities through pattern matching."
    
    return redaction_plan

def interactive_refinement(redaction_plan: RedactionPlan, user_feedback: str) -> RedactionPlan:
    """
    Allow user to refine the redaction plan with additional feedback
    
    Args:
        redaction_plan: Current redaction plan
        user_feedback: User's feedback (e.g., "also remove job titles", "keep email addresses")
        
    Returns:
        Updated RedactionPlan
    """
    
    llm = get_llm()
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are helping refine a redaction plan based on user feedback."),
        ("human", """Current plan:
{current_plan}

User feedback: {user_feedback}

Update the redaction plan accordingly. Return only the modified JSON.""")
    ])
    
    parser = PydanticOutputParser(pydantic_object=RedactionPlan)
    chain = prompt | llm | parser
    
    try:
        result = chain.invoke({
            "current_plan": redaction_plan.model_dump_json(indent=2),
            "user_feedback": user_feedback
        })
        return result
    except Exception as e:
        print(f"Error in refinement: {str(e)}")
        return redaction_plan

# Confidence-based filtering
def filter_by_confidence(redaction_plan: RedactionPlan, min_confidence: float = 0.7) -> RedactionPlan:
    """
    Filter entities based on minimum confidence threshold
    
    Args:
        redaction_plan: Original plan
        min_confidence: Minimum confidence score (0-1)
        
    Returns:
        Filtered RedactionPlan
    """
    filtered_entities = [
        entity for entity in redaction_plan.entities 
        if entity.confidence >= min_confidence
    ]
    
    redaction_plan.entities = filtered_entities
    redaction_plan.summary += f" (Filtered to {len(filtered_entities)} high-confidence entities)"
    
    return redaction_plan

# Context-aware redaction
def get_context_around_entity(text: str, entity_text: str, context_chars: int = 100) -> str:
    """Get surrounding context for an entity"""
    pos = text.find(entity_text)
    if pos == -1:
        return ""
    
    start = max(0, pos - context_chars)
    end = min(len(text), pos + len(entity_text) + context_chars)
    
    return text[start:end]

if __name__ == "__main__":
    # Example usage
    sample_intent = "Remove all personal information and contact details"
    sample_text = """
    John Smith
    Email: john.smith@company.com
    Phone: +1-555-0123
    Address: 123 Main Street, New York, NY 10001
    
    John has been working as a Software Engineer at TechCorp since 2020.
    His employee ID is EMP-12345.
    """
    
    result = analyze_intent(sample_intent, sample_text)
    print("Redaction Plan:")
    print(result.model_dump_json(indent=2))
