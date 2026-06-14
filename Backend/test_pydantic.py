
from pydantic import BaseModel
from typing import Optional

class RuleTranslateResponse(BaseModel):
    ok: bool
    rule: Optional[dict] = None
    error: Optional[str] = None

try:
    obj = RuleTranslateResponse(ok=True, rule={"test": 1})
    print("Success:", obj)
except TypeError as e:
    print("Error:", e)
