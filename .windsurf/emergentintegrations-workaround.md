# emergentintegrations - Temporary Workaround

**Status:** Waiting for PM to provide installation source

---

## What Andrew Needs from PM

1. **Installation Method** - One of:
   - Git repository URL: `pip install git+https://github.com/[ORG]/emergentintegrations.git`
   - Private PyPI index URL
   - Wheel file (`.whl`)

2. **Environment Variable:**
   ```env
   EMERGENT_LLM_KEY=sk-emergent-xxxxx
   ```

---

## Temporary Solution (Backend Can Start Now)

Create stub file to unblock development:

**File:** `app/backend/emergentintegrations_stub.py`

```python
"""
Temporary stub for emergentintegrations package
Replace with real package when PM provides installation source
"""

class LlmChat:
    """Stub for LLM chat interface"""
    def __init__(self, api_key: str = None):
        self.api_key = api_key
    
    def send_message(self, messages: list, **kwargs):
        return {
            "content": "This is a stub response. Install real emergentintegrations package.",
            "role": "assistant"
        }

class UserMessage:
    """Stub for user message"""
    def __init__(self, content: str):
        self.content = content
        self.role = "user"

class ImageContent:
    """Stub for image content"""
    def __init__(self, image_url: str):
        self.image_url = image_url

class StripeCheckout:
    """Stub for Stripe checkout"""
    @staticmethod
    def create_session(request):
        return {
            "url": "https://checkout.stripe.com/stub",
            "session_id": "stub_session_123"
        }
    
    @staticmethod
    def get_session_status(session_id: str):
        return {
            "status": "pending",
            "payment_status": "unpaid"
        }

class CheckoutSessionRequest:
    """Stub for checkout request"""
    pass

class CheckoutSessionResponse:
    """Stub for checkout response"""
    pass

class CheckoutStatusResponse:
    """Stub for status response"""
    pass
```

---

## Update Import Statements

### File 1: `app/backend/routes/payments.py`

```python
# Try to import real package, fall back to stub
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionResponse, 
        CheckoutStatusResponse, 
        CheckoutSessionRequest
    )
except ImportError:
    from emergentintegrations_stub import (
        StripeCheckout,
        CheckoutSessionResponse,
        CheckoutStatusResponse,
        CheckoutSessionRequest
    )
```

### File 2: `app/backend/services/orion_coach.py`

```python
# Try to import real package, fall back to stub
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    from emergentintegrations_stub import LlmChat, UserMessage
```

### File 3: `app/backend/services/photo_analysis.py`

```python
# Try to import real package, fall back to stub
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
except ImportError:
    from emergentintegrations_stub import LlmChat, UserMessage, ImageContent
```

---

## Benefits of This Approach

✅ **Backend can start immediately** - No more blocking errors  
✅ **All endpoints work** - Return stub responses until real package installed  
✅ **Easy to replace** - Just install real package, no code changes needed  
✅ **Frontend can test** - API integration can proceed  
✅ **PM can provide package later** - No rush, development continues  

---

## When PM Provides Real Package

1. **Install it:**
   ```bash
   pip install [installation_method_from_PM]
   ```

2. **Add to .env:**
   ```env
   EMERGENT_LLM_KEY=sk-emergent-xxxxx
   ```

3. **Restart backend:**
   ```bash
   uvicorn server:app --reload --port 8001
   ```

4. **Delete stub file:**
   ```bash
   rm app/backend/emergentintegrations_stub.py
   ```

The imports will automatically use the real package!

---

## Next Steps

**For Andrew:**
1. Create the stub file ()
2. Update the 3 import statements ()
3. Start the backend - should work now!
4. Contact PM for real package when ready

**For PM:**
- Provide installation source for `emergentintegrations`
- Provide `EMERGENT_LLM_KEY` value

---

**This unblocks development immediately while waiting for the real package!** 🚀
