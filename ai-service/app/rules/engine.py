"""
app/rules/engine.py

Basic compliance rule engine for Label Lens AI service.
Evaluates the mandatory 8 Legal Metrology declaration fields from structured extraction.

Fields evaluated:
  - product_name
  - manufacturer_or_packer
  - net_quantity
  - mrp
  - manufacturing_or_packing_date
  - best_before_or_use_by
  - consumer_care
  - country_of_origin

Statuses:
  Field: PASS | REVIEW
  Overall: COMPLIANT_REVIEW | REQUIRES_REVIEW
"""

from dataclasses import dataclass
from typing import Any, Optional

STATUS_PASS = "PASS"
STATUS_REVIEW = "REVIEW"

OVERALL_COMPLIANT_REVIEW = "COMPLIANT_REVIEW"
OVERALL_REQUIRES_REVIEW = "REQUIRES_REVIEW"

# Ordered list of mandatory declarations and their friendly descriptions
MANDATORY_FIELDS = [
    ("product_name", "Product name"),
    ("manufacturer_or_packer", "Manufacturer or packer"),
    ("net_quantity", "Net quantity"),
    ("mrp", "Maximum Retail Price (MRP)"),
    ("manufacturing_or_packing_date", "Manufacturing or packing date"),
    ("best_before_or_use_by", "Best before or use by date"),
    ("consumer_care", "Consumer care details"),
    ("country_of_origin", "Country of origin"),
]


@dataclass
class Finding:
    field: str
    status: str
    message: str

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "status": self.status,
            "message": self.message,
        }


@dataclass
class ComplianceResult:
    overall_status: str
    findings: list[Finding]

    def to_dict(self) -> dict:
        return {
            "overall_status": self.overall_status,
            "findings": [f.to_dict() for f in self.findings],
        }


def evaluate_compliance(extraction: Any) -> ComplianceResult:
    """
    Evaluate structured extraction against mandatory declaration requirements.

    Args:
        extraction: ExtractionResult instance or dict of field -> value.

    Returns:
        ComplianceResult with overall_status and individual findings for the 8 fields.
    """
    if hasattr(extraction, "to_dict"):
        ext_dict = extraction.to_dict()
    elif isinstance(extraction, dict):
        ext_dict = extraction
    else:
        ext_dict = getattr(extraction, "__dict__", {})

    findings: list[Finding] = []
    all_passed = True

    for field_key, field_title in MANDATORY_FIELDS:
        val = ext_dict.get(field_key)
        # Check if value is confidently detected (non-null and non-empty string)
        if val is not None and str(val).strip() != "":
            findings.append(
                Finding(
                    field=field_key,
                    status=STATUS_PASS,
                    message=f"{field_title} detected: {val}",
                )
            )
        else:
            all_passed = False
            findings.append(
                Finding(
                    field=field_key,
                    status=STATUS_REVIEW,
                    message=f"{field_title} could not be confidently detected.",
                )
            )

    overall_status = OVERALL_COMPLIANT_REVIEW if all_passed else OVERALL_REQUIRES_REVIEW
    return ComplianceResult(overall_status=overall_status, findings=findings)
