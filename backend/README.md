# Semantic Context Resolver – AWS Lambda

This AWS Lambda function semantically resolves natural language inputs by matching them to a structured domain configuration. It supports multi-turn conversations and allows for flexible routing decisions based on categories and concerns.

The domain configuration can either be:

1. **Dynamically loaded from Genesys Cloud (via DataTable)**
2. **Directly passed as a `domain` JSON object in the request**

---

## Invocation Options

### Option 1: Load Configuration from Genesys Cloud DataTable

The Lambda function fetches the domain configuration from a Genesys Cloud **DataTable row** using the `datatableId` and `rowKey`.

#### Request Payload

```json
{
  "datatableId": "example-table-id",
  "rowKey": "main",
  "text": "I want to cancel my credit card",
  "conversationHistory": [ ... ] // optional
}
```

#### Required Environment Variables

The following variables must be defined in your Lambda environment:

```python
GENESYS_CLIENT_ID       # OAuth2 client ID
GENESYS_CLIENT_SECRET   # OAuth2 client secret
GENESYS_ENVIRONMENT     # Genesys region, e.g., "mypurecloud.de"
```

These credentials are used to authenticate and retrieve the row content from Genesys Cloud.

---

### Option 2: Pass Domain Directly in Request

You can bypass the Genesys integration by directly providing the domain structure inline in the domain parameter.

#### Request Payload

```json
{
  "text": "pass the transcribed user input here",
  "domain": {
    "matrix": { ... },
    "targets": { ... },
    "categories": [ ... ],
    "concerns": [ ... ]
  },
  "conversationHistory": [ ... ] // optional
}
```

- `domain` can be either a JSON string or an object.
- This method is ideal for testing and decoupled architectures.

---

## Domain Configuration Schema

The domain describes how categories and concerns map to concrete resolution targets.

### Schema Structure Overview

```json
{
  "matrix": {
    "<category_id>": {
      "<concern_id>": {
        "type": "queue",
        "value": "<target_id>"
      }
    }
  },
  "targets": {
    "<target_id>": {
      "id": "<target_id>",
      "type": "queue",
      "value": "RoutingGroup"
    }
  },
  "categories": [ { ... } ],
  "concerns": [ { ... } ]
}
```

### Component Details

#### matrix

- Maps combinations of category and concern to a resolution object (`type`, `value`)
- Types are arbitrary (e.g., `queue`, `faq`, `guide`, `info_agent`, `diy`)
- Value should match a valid id of one of these types, e.g. `target.id` from the target objects

#### targets

Defines resolution destinations.

```json
"targets": {
  "target-uuid": {
    "id": "target-uuid",
    "type": "queue",
    "value": "<a name of a queue>"
  }
}
```

#### categories

Supports  `subcategories` for top level category. Each category may contain:

- `keywords`: list of relevant terms
- `phrases`: list of example utterances

```json
"categories": [
  {
    "id": "1",
    "name": "Online Banking",
    "keywords": ["login", "transfer"],
    "phrases": ["I want to log in"],
    "subcategories": [
      {
        "id": "11",
        "name": "Login Issues",
        "keywords": ["login problem"],
        "phrases": []
      }
    ]
  }
]
```

> **Note:** `subcategories` is optional.

#### concerns

List of concern types, similar in structure to categories (but flat, currently no subconcerns allowed).

```json
"concerns": [
  {
    "id": "134",
    "name": "Cancellation",
    "keywords": ["terminate", "cancel"],
    "phrases": ["I want to cancel my account"]
  }
]
```

---

## Conversation History

This array is used to preserve context in multi-turn interactions. Each element is one turn and contains the text (user Input) as well as the selected element in this turn. Here the complete selected object from the result in this turn can be passed, but since it returns the full category object which can be quite large its propably better to pass only the id attribute from selected category/concern object. Currently no other attribute is used.

```json
"conversationHistory": [
  {
    "text": "I need help with my credit card",
    "selected": {"category": {"id": "201"}}
  }
]
```

---

## Response Format

The Lambda returns an object containing a **resolution strategy**, and the selected and/or available elements (category/concern).

### Full Resolution (no further input required)

```json
{
  "strategy": "resolved",
  "selected": {
    "category": { ... },
    "concern": { ... },
    "target": {
      "type": "queue",
      "value": "CustomerService"
    }
  }
}
```

### Resolution Strategies

| Strategy               | Description |
|------------------------|-------------|
| `resolved`             | Final decision made – category and concern are clear |
| `specify_concern`      | Category was resolved, but concern must be clarified |
| `specify_category`     | Concern was resolved, but category must be clarified |
| `disambiguate_category`| Multiple matching categories found – user must choose |

---

### Example: Require Concern Selection

```json
{
  "strategy": "specify_concern",
  "selected": {
    "category": {
      "id": "1",
      "name": "Online Banking"
    }
  },
  "options": [
    {
      "id": "134",
      "name": "Cancellation"
    },
    {
      "id": "135",
      "name": "Request Information"
    }
  ]
}
```

---

### Example: Require Category Selection

```json
{
  "strategy": "specify_category",
  "selected": {
    "concern": {
      "id": "100",
      "name": "Cancellation"
    }
  },
  "options": [
    {
      "id": "11",
      "name": "Credit Cards"
    },
    {
      "id": "12",
      "name": "Loans"
    }
  ]
}
```

---

## File Structure

| File                | Description |
|---------------------|-------------|
| `lambda_function.py`| Lambda entry point with logic to parse and dispatch requests |
| `context_resolver.py`| Manages stateful resolution logic and routing strategy |
| `semantic_interpreter.py`| Performs semantic concern and category matching |

---