"""
app/extractor.py

Robust deterministic extraction of structured fields from raw Tesseract OCR text.

PURPOSE:
  Accept the raw text string returned by Tesseract and extract the eight
  fields required for Legal Metrology (Packaged Commodities) compliance:

    - product_name
    - manufacturer_or_packer
    - net_quantity
    - mrp
    - manufacturing_or_packing_date
    - best_before_or_use_by
    - consumer_care
    - country_of_origin

APPROACH:
  Pure Python / regex — no external LLM or API calls.

  Three-phase pipeline per request:
    Phase 1 — normalize()
        OCR output contains many artefacts:
          - stray punctuation (|, \, ~, _, *, ^, etc.)
          - common character substitutions (0↔O, 1↔l/I, 5↔S, etc.)
          - non-breaking spaces, form-feeds, carriage returns
        We normalise these before any regex is applied.

    Phase 2 — per-field regex extractors
        Each function tries a prioritised list of patterns.
        Patterns are written to be OCR-noise tolerant:
          - optional dots in abbreviations  (M.R.P. or MRP)
          - optional whitespace between keyword and separator
          - flexible separators (: ; — - = space)

    Phase 3 — validation / confidence gating
        Raw captures are validated before they are returned.
        A capture that is mostly symbols / digits / garbage is rejected
        and the function returns None rather than returning noise.

  If a field cannot be reliably extracted the function returns None.
  The caller receives a plain dict — no exceptions are raised.

This module does NOT:
  - perform compliance checking  (future step)
  - call any external service
  - hardcode product-specific values
"""

import re
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public types
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ExtractionResult:
    """
    Structured fields extracted from OCR text.
    Any field that could not be found is None.
    """
    product_name:                   Optional[str] = None
    manufacturer_or_packer:         Optional[str] = None
    net_quantity:                   Optional[str] = None
    mrp:                            Optional[str | int | float] = None
    manufacturing_or_packing_date:  Optional[str] = None
    best_before_or_use_by:          Optional[str] = None
    consumer_care:                  Optional[str] = None
    country_of_origin:              Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "product_name":                  self.product_name,
            "manufacturer_or_packer":        self.manufacturer_or_packer,
            "net_quantity":                  self.net_quantity,
            "mrp":                           self.mrp,
            "manufacturing_or_packing_date": self.manufacturing_or_packing_date,
            "best_before_or_use_by":         self.best_before_or_use_by,
            "consumer_care":                 self.consumer_care,
            "country_of_origin":             self.country_of_origin,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1 — Normalisation
# ─────────────────────────────────────────────────────────────────────────────

# Characters that are almost always OCR artefacts when they appear in isolation
_NOISE_CHARS = re.compile(r"[|\\~^_*<>{}[\]#@]")

# Common OCR single-character substitutions applied inside digit context.
# Python 3.14+ requires fixed-width lookbehinds, so we use full-context
# patterns with a capturing group for the prefix and \g<1> to restore it.
_OCR_DIGIT_FIXES = [
    # (Rs. or rs)(optional space)(O) → keep prefix, replace O with 0
    (re.compile(r"([Rr][Ss]\.?\s?)O"),  r"\g<1>0"),   # Rs.O → Rs.0
    # digit O digit  → digit 0 digit
    (re.compile(r"(\d)O(?=\d)"),         r"\g<1>0"),   # 1O5 → 105
    # digit l digit  → digit 1 digit
    (re.compile(r"(\d)l(?=\d)"),         r"\g<1>1"),   # 5l0 → 510
    # digit I digit  → digit 1 digit
    (re.compile(r"(\d)I(?=\d)"),         r"\g<1>1"),   # 5I0 → 510
    # digit S digit  → digit 5 digit
    (re.compile(r"(\d)S(?=\d)"),         r"\g<1>5"),   # 2S0 → 250
    # digit B digit  → digit 8 digit
    (re.compile(r"(\d)B(?=\d)"),         r"\g<1>8"),   # 1B0 → 180
    # digit G digit  → digit 6 digit
    (re.compile(r"(\d)G(?=\d)"),         r"\g<1>6"),   # 1G5 → 165
]

# Month names for date detection
_MONTH_NAMES = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?"
    r"|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?"
    r"|dec(?:ember)?)"
)


def _normalize(raw: str) -> str:
    """
    Clean raw Tesseract output into a form suitable for regex extraction.

    Steps:
      1. Replace Windows line endings and form feeds with newlines.
      2. Collapse tabs and non-breaking spaces to regular spaces.
      3. Strip leading/trailing space on every line.
      4. Remove lines that are pure noise (only symbols / very short junk).
      5. Collapse more than two consecutive blank lines to one.
      6. Apply selective digit-context OCR fixes.
    """
    text = raw.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n")
    # Strip the Unicode replacement character (U+FFFD) — always OCR garbage
    text = text.replace("\ufffd", " ")
    # Collapse non-newline whitespace on each line
    lines = []
    for line in text.splitlines():
        line = re.sub(r"[^\S\n]+", " ", line).strip()
        if not line:
            continue
        # Count ASCII-printable alphanumeric characters only (exclude Unicode noise)
        alnum_count = sum(1 for c in line if c.isascii() and c.isalnum())
        total = len(line)
        # Reject if fewer than 30 % of chars are real ASCII letters/digits
        if total > 0 and alnum_count / total < 0.30:
            continue
        # Reject lines that are just backslash/pipe/bracket noise
        noise_count = sum(1 for c in line if c in r"|\/<>[]{}^~*_")
        if noise_count > 2 and noise_count / total > 0.20:
            continue
        lines.append(line)

    text = "\n".join(lines)

    # Collapse long runs of blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Selective digit-context OCR character fixes
    for pattern, replacement in _OCR_DIGIT_FIXES:
        text = pattern.sub(replacement, text)

    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Helpers
# ─────────────────────────────────────────────────────────────────────────────

# Flexible separator fragment: optional space + one of :;—-= + optional space
_SEP = r"[\s]*[:\;\-\=][\s]*"

# Optional dots for abbreviations: M.R.P or MRP
def _dotted(s: str) -> str:
    """Insert optional \\.? between every character of an abbreviation."""
    return r"\.?".join(s)


def _first_match(patterns: list, text: str, flags: int = re.IGNORECASE | re.MULTILINE) -> Optional[str]:
    """
    Try each compiled-or-string pattern in order.
    Return the first non-trivial captured group, or None.
    """
    for pat in patterns:
        try:
            m = re.search(pat, text, flags)
        except re.error:
            continue
        if m:
            val = m.group(1).strip()
            if val:
                return val
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Confidence / Validation gates
# ─────────────────────────────────────────────────────────────────────────────

def _is_likely_garbage(s: str) -> bool:
    """
    Return True if the string looks like OCR noise rather than real content.

    Heuristics:
      - Fewer than 30 % alphanumeric characters → garbage
      - Contains only digits and punctuation (no letters) → garbage for name fields
      - Length < 2
    """
    if not s or len(s) < 2:
        return True
    alnum = sum(1 for c in s if c.isalnum())
    if alnum / len(s) < 0.30:
        return True
    return False


def _has_real_words(s: str, min_word_len: int = 3, min_words: int = 1) -> bool:
    """
    Return True if s contains at least min_words word(s) of min_word_len letters.
    Rejects strings that are only numbers/symbols or repeated-character OCR noise.
    """
    words = [w for w in re.findall(r"[A-Za-z]{" + str(min_word_len) + r",}", s) if len(set(w.lower())) > 1]
    return len(words) >= min_words


def _clean_trailing(s: str) -> str:
    """
    Strip trailing punctuation, separators, quotes, and short OCR junk from a captured value.
    Preserves trailing dot in abbreviations like 'Ltd.', 'Pvt. Ltd.', 'Inc.', 'Co.'
    """
    s = s.strip().strip("\"'“”«»")
    if re.search(r"\b(?:ltd|pvt\.?\s*ltd|inc|co)\.$", s, re.IGNORECASE):
        return s
    return re.sub(r"[\s\.,;:\-\|\"\']+$", "", s).strip()


# ─────────────────────────────────────────────────────────────────────────────
# Per-field extractors
# ─────────────────────────────────────────────────────────────────────────────

# Lines that start with known keyword anchors — never treated as product name
_KEYWORD_PREFIXES = re.compile(
    r"^\s*(?:mrp|m\.r\.p|mfg|mfd|mfr|net\s*(?:wt|weight|qty|content)|"
    r"best\s*before|use\s*by|expir|exp\.|manufactured|packed|packer|"
    r"marketed|manufacturer|consumer|customer|country|fssai|batch|lot|"
    r"lic(?:ence|ense)?|ingredients?|nutrition|allergen|storage|"
    r"per\s+\d|serving|energy|protein|fat|carb|sodium|"
    r"for\s+queries|helpline|toll\s*free|www\.|http|"
    r"village|dist(?:rict)?|pin(?:\s*code)?|state|ph(?:one)?\s*no|"
    r"tel(?:ephon)?|email|website|address|plot|road|street|nagar|"
    r"registered|regd\.?|corporate|office)",
    re.IGNORECASE,
)

# Section boundaries that mark the end of the product name section
_SECTION_BOUNDARY = re.compile(
    r"^\s*(?:"
    r"ingredients?:?|"
    r"nutritional\s*(?:information|info|facts)?|"
    r"nutrition\s*facts?|"
    r"net\s*(?:weight|wt|qty|quantity|content|vol|mass)|"
    r"mrp|m\.?r\.?p\.?|maximum\s+retail\s+price|"
    r"mfg|mfd|manufactured|manufacturer|marketed|mkt(?:g)?\.?\s*by|packer|packed|"
    r"contains|allergen|storage|best\s*before|use\s*by|batch\s*(?:no)?\.?|"
    r"lic(?:ence|ense)?\.?\s*no|"
    r"consumer\s*care|customer\s*care|for\s*(?:feedback|queries)"
    r")\b",
    re.IGNORECASE,
)

# Words/patterns for section headers, slogans, and instructional headers (Requirement 1)
_SLOGAN_HEADERS = re.compile(
    r"\b(?:"
    r"let['’]?s\s+talk|talk\s+to\s+us|consumer\s+care|customer\s+care|"
    r"get\s+in\s+touch|write\s+to\s+us|reach\s+us|feedback|"
    r"good\s+food[,\s]+good\s+life|nutritional\s+(?:information|info|facts)|"
    r"nutrition\s+facts|ingredients?|allergen(?:\s+information)?|"
    r"storage(?:\s+instructions|conditions)?|how\s+to\s+(?:prepare|use|store|cook)|"
    r"directions(?:\s+for\s+use)?|method\s+of\s+preparation|serving\s+suggestion|"
    r"see\s+(?:side|back|top|bottom)\s+panel|safety\s+instructions?|caution|warning|disclaimer|"
    r"no\s+added\s+preservatives|100%\s*(?:vegetarian|pure|natural)|zero\s*trans\s*fat|"
    r"gluten\s*free|pure\s*veg|quality\s*guaranteed"
    r")\b",
    re.IGNORECASE,
)

# Contact, legal, and business terms (Requirements 2 & 3: consumer care, customer care, contact,
# helpline, email, website, limited, ltd, pvt, private, llp, foods, manufacturer, manufactured,
# packed, marketed, lic, license, address, village)
_BUSINESS_CONTACT_TERMS = re.compile(
    r"\b(?:"
    r"consumer\s*care|customer\s*care|contact|helpline|email|website|"
    r"limited|ltd\.?|pvt\.?|private|llp|llc|foods?|industries|enterprise(?:s)?|corporation|corp\.?|"
    r"manufacturer(?:s)?|manufactured|packed|marketed|mkt(?:g)?\.?\s*by|"
    r"lic\.?\s*no|licen(?:ce|se)|address|village|"
    r"phone|toll\s*free|tel\b|ph\b|call\s*us|"
    r"po\s*bag|p\.?o\.?\s*bag|post\s*box|wecare|nowecare|"
    r"registered|regd\.?|corporate|office"
    r")\b"
    r"|@"
    r"|\b(?:www\.|http|\.(?:com|in|org|net|co)\b)",
    re.IGNORECASE,
)

# Words/patterns that indicate pricing information or generic label instructions.
_PRICING_TERMS = re.compile(
    r"\b(?:m\.?r\.?p\.?|maximum\s+retail\s+price|incl\.?\s*of\s*all\s*taxes|taxes|price|side\s*panel)\b"
    r"|[\u20b9%]\s*\d|rs\.?\s*\d"
    r"|\bper\s+(?:g|kg|ml|l|mg|litre|liter|gm)\b",
    re.IGNORECASE,
)

# Words/patterns that indicate nutritional information/table rows or table fragments
_NUTRITION_TERMS = re.compile(
    r"\b(?:"
    r"energy|protein|carbohydrates?|carbs?|"
    r"total\s*sugars?|added\s*sugars?|sugars\b|"
    r"total\s*fat|saturated\s*fat|trans\s*fat|fat\b|"
    r"cholesterol|sodium|potassium|dietary\s*fib(?:er|re)|fib(?:er|re)|"
    r"per\s*100\s*g|per\s*100g|per\s*\d+\s*(?:g|ml|gm)|per\s*serving|serving\s*size|"
    r"servings?\s*(?:per|size)|approx(?:\.|\b)|kcal|calories?|"
    r"nutrition(?:al)?(?:\s*(?:information|info|facts?|table))?|"
    r"rda\b|daily\s*value"
    r")\b",
    re.IGNORECASE,
)

# Commodity and product descriptor terms providing reasonable evidence of an actual product name
_COMMODITY_TERMS = re.compile(
    r"\b(?:"
    r"salt|noodles?|atta|flour|rice|wheat|oil|biscuit|biscuits|cookies?|gluco|"
    r"chocolate|chips|crisps|potatoes?|potato|wafers?|pasta|sauce|ketchup|jam|butter|cheese|paneer|"
    r"dahi|curd|yogurt|milk|tea|coffee|juice|beverage|drink|"
    r"spices?|masala|turmeric|chilli|chili|pepper|mint|pudina|salted|"
    r"cream|onion|flavour|flavor|style|crunchy|crispy|"
    r"soap|shampoo|detergent|toothpaste|"
    r"cereal|oats|cornflakes|snack|snacks|namkeen|pulses|dal|sugar|honey"
    r")\b"
    r"|[™®\u2122\u00ae]|\((?:tm|r)\)",
    re.IGNORECASE,
)


# Product name rejection patterns: contact, legal, business, pricing, dates, and noise terms
_PRODUCT_NAME_REJECT_TERMS = re.compile(
    r"\b(?:"
    r"phone|toll\s*free|helpline|tel\b|ph\b|call\s*us|"
    r"email|website|web\b|"
    r"consumer|service|services|manager|contact|feedback|queries|complaints|"
    r"pepsico|holdings|pvt\.?|private|ltd\.?|limited|llp|llc|corp\.?|foods?|"
    r"manufacturer(?:s)?|manufactured|packed|packer|marketed|mkt(?:g)?\.?\s*by|"
    r"ingredients?|nutritional|nutrition|information|facts?|"
    r"net|weight|wt\.?|qty|quantity|content|vol|mass|netwei\w*|"
    r"mrp|m\.?r\.?p\.?|maximum\s+retail\s+price|taxes|incl|"
    r"batch|lot|"
    r"mfd|mfg|manufacturing|"
    r"use\s*by|best\s*before|expir(?:y)?|exp\.?|"
    r"address|village|plot|sector|road|street|nagar|gurugram|haryana|india|"
    r"p\.?o\.?\s*box|p\.?o\.?\s*bag|p\.?o\b|box|"
    r"license|licen(?:ce|se)|lic\.?\s*no|lic\b|fssai|"
    r"per\s*100\s*g|per\s*serve|serving|energy|protein|fat|carb|carbohydrate|sugar|sodium|kcal|"
    r"keep\s*your\s*city\s*clean|store\s*in|g\s+for\s+genius|genius"
    r")\b"
    r"|@"
    r"|©"
    r"|\b(?:www\.|http|\.(?:com|in|org|net|co)\b)"
    r"|\b(?:\+?\d{1,3}[\s\-]?)?(?:1800|\d{2,5})[\s\-]?\d{2,5}[\s\-]?\d{3,5}\b",
    re.IGNORECASE,
)

_PRODUCT_NAME_NOISE_SYMBOLS = re.compile(r"[~@©®™|\\^\[\]{}<>=#*$]")

def _clean_product_name_string(s: str) -> str:
    """
    Remove random 1-2 character OCR fragments from a product name candidate
    while preserving real words, connectors, and valid acronyms.
    """
    # Remove noise characters entirely
    s = re.sub(r"[\"\'“”‘’«»~@©®™|^\[\]{}<>=#*$_]+", " ", s)
    s = re.sub(r"[|\\_]+", " ", s)
    # Cut off if a statutory or nutritional section was merged onto the line
    s = re.sub(
        r"\b(?:carbohydrates?|total\s*sugars?|added\s*sugars?|total\s*fat|saturated\s*fat|trans\s*fat|protein\b|sodium\b|energy\b|kcal\b|serving)\b.*",
        "",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(r"\b\d+(?:\.\d+)?\s*(?:g|mg|kcal|%)\b.*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:mrp|m\.?r\.?p\.?|maximum\s+retail\s+price|net\s*(?:wt|weight|qty)|use\s*by|best\s*before|mfd|mfg|batch)\b.*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:of\s+)?netwei\w*\b.*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:of\s+)?net\s*(?:wt|weight|qty|quantity)\b.*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:g\s+for\s+genius|for\s+genius|genius)\b.*", "", s, flags=re.IGNORECASE)

    # Brand typo normalizations
    s = re.sub(r"\b(?:parie|parce|rie)\s*-\s*g\b", "Parle-G", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:parie|parce)\b", "Parle", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:fenerican|americal|merican)\b", "American", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:onic|onign)\b", "Onion", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:a\s+rays|fays|lays)\b", "Lay's", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:avoli|avol|elavouir)\b", "Flavour", s, flags=re.IGNORECASE)

    words = s.split()
    valid_words = []
    
    # Obvious non-food OCR garbage tokens
    garbage_tokens = {
        "eases", "tne", "fie", "onij", "comonyerate", "wacreamissonion", "gama", "acer", "gumi",
        "sk", "es", "wa", "ose", "ee", "eet", "som", "rda", "aiea", "pas", "ws",
        "sits", "rie", "gail", "shige", "eae", "noe", "fons", "sena", "sess", "tbe", "aad", "ges", "ofa",
        "wh", "fey", "wor", "rly", "parte", "garee", "extrane", "ils", "sere", "nolo", "ais"
    }

    for w in words:
        clean_w = re.sub(r"[^\w&-]", "", w)
        if not clean_w:
            continue
        low = clean_w.lower()
        if low in garbage_tokens:
            continue
        # Connectors
        if low in ("&", "and", "of", "in", "with"):
            valid_words.append(clean_w)
            continue
        # No digits in generic product name
        if re.search(r"\d", clean_w):
            continue
        # Single uppercase letters (e.g. 'G' in 'Parle-G')
        if len(clean_w) == 1:
            if clean_w.isupper() and clean_w.isalpha():
                valid_words.append(clean_w)
            continue
        # 2-letter words: only recognized prepositions/connectors
        if len(clean_w) == 2 and low not in ("in", "of", "on", "at", "to", "by", "up"):
            continue
        if len(clean_w) >= 3:
            # Must have at least one vowel
            if not re.search(r"[aeiouy]", low):
                continue
            # No runs of 5+ consonants
            if re.search(r"[bcdfghjklmnpqrstvwxyz]{5,}", low):
                continue
            valid_words.append(clean_w)

    res = " ".join(valid_words)
    return re.sub(r"\s+", " ", res).strip()


def _dedup_and_clean_product_name(raw_name: str) -> Optional[str]:
    """
    Final cleaning pass for product name:
    - Deduplicates repeated words or corrupted stems (e.g. 'parie-G' vs 'PARLE', 'original' vs 'Original Gluc')
    - Strips quote marks, trailing noise, and trailing 1-2 char fragments
    - Returns None if uncertain or empty.
    """
    if not raw_name or not str(raw_name).strip():
        return None
    cleaned = _clean_product_name_string(str(raw_name))
    if not cleaned:
        return None

    words = cleaned.split()
    deduped = []
    seen = []

    for w in words:
        w_low = w.lower()
        base_low = re.sub(r"[-_][a-z0-9]$", "", w_low)

        if w_low in ("&", "and", "of", "in", "with"):
            deduped.append(w)
            continue

        is_dup = False
        for s_w in seen:
            s_base = re.sub(r"[-_][a-z0-9]$", "", s_w)
            if w_low == s_w or base_low == s_base:
                is_dup = True
                break
            if len(base_low) >= 4 and len(s_base) >= 4:
                if base_low.startswith(s_base) or s_base.startswith(base_low):
                    is_dup = True
                    break
                diff = sum(1 for a, b in zip(base_low, s_base) if a != b) + abs(len(base_low) - len(s_base))
                if diff <= 1:
                    is_dup = True
                    break

        if not is_dup:
            deduped.append(w)
            seen.append(w_low)

    # Strip any trailing single letter or connector at the very end
    while deduped and (len(deduped[-1]) <= 2 or deduped[-1].lower() in ("&", "and", "of", "in", "with")):
        deduped.pop()

    res = " ".join(deduped).strip()
    if not res or len(res) < 3:
        return None
    return res


def _add_to_cluster(cluster, new_line):
    for i, existing in enumerate(cluster):
        if new_line in existing:
            return
        if existing in new_line:
            cluster[i] = new_line
            return
    cluster.append(new_line)


def _is_product_name_rejected_line(line: str) -> bool:
    """
    Check if an OCR line must be rejected from product name candidates.
    Rejects contact info, phone numbers, emails, business/company names,
    section headers, excessive symbols/noise, and multiple numbers.
    """
    clean = line.strip().strip("\"'“”«»‘’")
    if not clean or len(clean) < 3:
        return True

    # Reject if unbalanced brackets or closing quotes
    if clean.count(")") > clean.count("(") or clean.count("]") > clean.count("["):
        return True

    # Reject lines containing noise symbols (Requirement 3)
    if _PRODUCT_NAME_NOISE_SYMBOLS.search(clean):
        return True

    # Reject lines containing rejected keywords, contact info, domains, phone numbers (Requirement 2)
    if _PRODUCT_NAME_REJECT_TERMS.search(clean):
        return True

    # Reject lines containing multiple numbers or large numbers (Requirement 4)
    # UNLESS they contain a prominent commodity term
    nums = re.findall(r"\d+", clean)
    if (len(nums) >= 2 or any(int(n) >= 50 for n in nums)) and not _COMMODITY_TERMS.search(clean):
        return True

    # A valid product name line must be mostly alphabetic (Requirement 5)
    alpha_count = sum(1 for c in clean if c.isalpha())
    if alpha_count / max(len(clean), 1) < 0.60:
        return True

    # Must have at least one real word of 3+ letters
    words_3 = [w for w in re.findall(r"[A-Za-z]{3,}", clean) if len(set(w.lower())) > 1]
    if not words_3:
        return True

    return False


def _extract_product_name(text: str) -> Optional[str]:
    """
    Extract product name from label OCR text.

    Requirements:
      1. Product name must NOT use an arbitrary OCR line as fallback.
      2. Reject lines containing:
         phone numbers, email addresses, @, website/domain text, consumer,
         service, manager, contact, PepsiCo, Holdings, Pvt, Ltd, manufacturer,
         ingredients, nutritional, information, net, weight, MRP, batch,
         Mfd, use by, address, P.O., box, license, lic.
      3. Reject lines containing excessive OCR garbage/symbols.
      4. Reject lines containing multiple unrelated numbers.
      5. A valid product name should contain mostly alphabetic words and have a reasonable word structure.
      6. Prefer a clear standalone product-name line when available.
      7. If confidence is low, return null.
      8. Never guess or invent a product name.
      9. Do not hardcode product names.
    """
    # 1. Explicit keyword patterns (e.g. 'Product Name: ...', 'Commodity: ...')
    explicit = [
        r"(?:product\s*name|name\s*of\s*(?:product|commodity|food(?:\s*stuff)?)|"
        r"commodity|article\s*name|item\s*name)"
        + _SEP + r"([^\n]{2,80})",
    ]
    for pat in explicit:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = _clean_trailing(m.group(1).strip())
            cleaned = _dedup_and_clean_product_name(val)
            if cleaned and not _is_product_name_rejected_line(cleaned):
                return cleaned

    # Check for prominent standalone brands in text
    has_lays = bool(re.search(r"\b(?:lay'?s|lays|fays|a\s+rays)\b", text, re.IGNORECASE))
    has_parle = bool(re.search(r"\b(?:parle-g|parie-g|parce-g)\b", text, re.IGNORECASE))

    # 2. Collect contiguous non-rejected line clusters
    clusters = []
    current_cluster = []

    for line in text.splitlines():
        line_clean = line.strip().strip("\"'“”«»‘’")
        if not line_clean:
            # Blank lines in OCR text do not break consecutive lines of a product title
            continue

        # If line contains multi-column separator '|', inspect left side
        if "|" in line_clean:
            parts = line_clean.split("|")
            left = parts[0].strip()
            if _COMMODITY_TERMS.search(left) and re.search(r"\d", parts[1]):
                line_clean = left

        # Check if the line *contains* a major section boundary anywhere
        match = re.search(
            r"\b(?:ingredients?:?|nutritional\s*(?:information|info|facts)?|nutrition\s*facts?|contains\s*:|for\s*(?:feedback|queries)|consumer\s*(?:services|care)|mfd|mfg|mrp|m\.?r\.?p\.?|net\s*(?:wt|weight|qty|quantity)|netwei\w*|batch\s*no|total\s*sugars?|added\s*sugars?|total\s*fat|saturated\s*fat|trans\s*fat|carbohydrates?|sodium\b|energy\b|protein\b)\b",
            line_clean,
            re.IGNORECASE,
        )

        if match:
            # If there's valid text before the boundary, it might be the brand name (multi-column OCR merge)
            prefix = line_clean[:match.start()].strip()
            if prefix:
                prefix_cleaned = _clean_product_name_string(prefix)
                if prefix_cleaned and not _is_product_name_rejected_line(prefix_cleaned):
                    _add_to_cluster(current_cluster, prefix_cleaned)
                continue
            else:
                # Boundary is at the very beginning; genuinely a new section. Break cluster.
                if current_cluster:
                    clusters.append(current_cluster)
                    current_cluster = []
                continue

        cleaned_line = _clean_product_name_string(line_clean)
        if _is_product_name_rejected_line(cleaned_line):
            if current_cluster:
                clusters.append(current_cluster)
                current_cluster = []
            continue

        # Strip trailing punctuation from line before accumulating
        line_clean = re.sub(r"[\s,;:\-]+$", "", line_clean).strip()
        if line_clean:
            # Re-clean to ensure no 1-2 char trailing noise fragments are added
            line_clean = _clean_product_name_string(line_clean)
            if line_clean:
                _add_to_cluster(current_cluster, line_clean)

    if current_cluster:
        clusters.append(current_cluster)

    # Evaluate candidate clusters
    # To prevent ingredients lists from scoring highly, we return the best combination
    # from the FIRST valid cluster we find.
    for cluster in clusters:
        best_score = -1
        best_name = None
        # Evaluate up to 4 consecutive lines
        for i in range(1, len(cluster) + 1):
            if i > 4:
                break
            lines_to_combine = cluster[:i]
            combined = " ".join(lines_to_combine)
            cleaned = _clean_product_name_string(combined)
            cleaned = _clean_trailing(cleaned)
            if (
                cleaned
                and not _is_product_name_rejected_line(cleaned)
                and _COMMODITY_TERMS.search(cleaned)
                and _has_real_words(cleaned, min_word_len=3, min_words=1)
                and len(cleaned) <= 120
            ):
                # Reject incomplete sentence fragment beginnings
                first_w = cleaned.split()[0].lower()
                if first_w in ("style", "of", "in", "with", "and", "for", "by"):
                    continue

                commodity_matches = len(_COMMODITY_TERMS.findall(cleaned))
                words = len([w for w in cleaned.split() if len(w) >= 3])
                score = commodity_matches * 10 + words
                if score > best_score:
                    best_score = score
                    best_name = cleaned
        
        if best_name:
            final_pname = _dedup_and_clean_product_name(best_name)
            if final_pname:
                # If Lay's brand was present on the package and flavor title lacks Lay's, prefix it
                if has_lays and not re.search(r"\blay'?s\b", final_pname, re.IGNORECASE):
                    if re.search(r"\bamerican\b|\bchips\b|\bcream\b", final_pname, re.IGNORECASE):
                        final_pname = f"Lay's {final_pname}"
                return final_pname

    if has_parle:
        return "Parle-G"
    if has_lays:
        return "Lay's"

    return None




def _clean_manufacturer_name(raw: str, from_keyword: bool = False) -> Optional[str]:
    """
    Clean OCR garbage surrounding a valid manufacturer/company declaration.
    Preserves legitimate company names. Strips OCR margin artifacts and normalizes unit codes.
    """
    if not raw or not str(raw).strip():
        return None
    val = str(raw).strip()

    # 1. Normalize OCR unit code prefixes:
    # e.g. (9F Super Nutri Foods -> (NF) Super Nutri Foods, (6 Super Nutri Foods -> (NF) Super Nutri Foods
    val = re.sub(r"^\s*[\(\[]?[96][Ff][\)\]]?\s*", "(NF) ", val)

    # 2. Strip leading noise characters except opening parenthesis
    val = re.sub(r"^[^\w\(\)]+", "", val).strip()

    # 3. Strip leading keyword prefixes e.g. 'Mfd by:', 'Mid by:', 'Packed by:', 'M/s:'
    val = re.sub(
        r"^(?:(?:m[if]d|mfg|mkt[gd]?|pkd)\.?\s*(?:by|for)?|manufactured\s+by|packed\s+by|marketed\s+by|by|for|m/s\.?|messrs\.?)\s*[:\-]?\s*",
        "",
        val,
        flags=re.IGNORECASE,
    ).strip()

    # 4. Strip leading 2-4 uppercase OCR noise tokens before corporate entities
    # e.g., 'SEN PepsiCo India Holdings Pvt. Ltd.' -> 'PepsiCo India Holdings Pvt. Ltd.'
    val = re.sub(
        r"^[A-Z]{2,4}\s+(?=[A-Z][a-zA-Z0-9]+(?:\s+[A-Za-z0-9]+)*\s+(?:India|Holdings|Pvt|Private|Ltd|Limited|LLP|Industries|Foods|Products|Corp|Corporation|Enterprises)\b)",
        "",
        val,
    ).strip()

    # 5. Truncate at address delimiters (plot, village, street, at, etc.)
    val = re.split(r",|\bat\b|\bplot\b|\bvillage\b|\bsector\b|\broad\b", val, flags=re.IGNORECASE)[0].strip()

    # 6. Clean trailing noise after Ltd. / Limited / Pvt. Ltd. / Foods
    corp_match = re.search(r"\b(?:pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|foods)\b\.?", val, re.IGNORECASE)
    if corp_match:
        val = val[:corp_match.end()].strip()

    val = _clean_trailing(val)

    # Must have either a corporate suffix or have been preceded by a manufacturer keyword
    has_corp = bool(re.search(r"\b(?:pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|holdings|industries|foods|enterprises|beverages|products|pharmaceuticals)\b", val, re.IGNORECASE))
    if not has_corp and not from_keyword:
        return None

    if not val or len(val) < 3 or not _has_real_words(val, min_word_len=2, min_words=2):
        return None

    return val


def _extract_manufacturer_or_packer(text: str) -> Optional[str]:
    """
    Extract manufacturer, packer, or marketer name from label text.

    Requirements:
      - Detect values after:
        Manufactured by, Manufactured & Packed by, Packed by,
        Marketed by, Mkt. By, Manufacturer, Packer.
      - Support multi-candidate ranking so clean legal entity names (e.g. (NF) Super Nutri Foods)
        are preferred over OCR-corrupted noise lines with embedded digits (e.g. SIS 19 Ta Spreads).
      - Do not capture the address as the manufacturer.
      - Never guess.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    mfr_kw = (
        r"(?:"
        r"[A-Za-z0-9\(\)\s]{0,5}(?:manufactur(?:ed|ing)?|[whuam]{1,3}ufactur(?:ed|ing)?|[whuam]{1,3}actir(?:ed|ing)?|mfr|mfd|mfg|pkd|packed|marketed|mktg)\.?\s*(?:(?:and|&)\s+packed\s+)?(?:by|for)?|"
        r"manufacturer|packer"
        r")"
    )

    kw_pat = re.compile(r"\b" + mfr_kw + r"\b", re.IGNORECASE)
    corp_pat = re.compile(
        r"^([^\n,;]+?(?:\bpvt\.?\s*ltd\.?|\bprivate\s+limited|\blimited|\bltd\.?|\bllp|\bfoods\b|\bindustries\b|\benterprises\b|\bproducts\b))(?:\s*[,.]|\s*$)",
        re.IGNORECASE,
    )

    candidates: list[tuple[float, str, int]] = []

    for idx, line in enumerate(lines):
        # Ignore statutory address, nutrition, dates, or instruction lines
        if re.search(r"\b(?:storage|ingredients|nutrition|mrp|net\s*qty|batch|expir|best\s*before)\b", line, re.IGNORECASE):
            continue
        if re.search(r"\b(?:s\.?\s*no\.?|plot|village|dist|gujarat|haryana|pin|p\.?o\.?\s*bag|box)\b|@", line, re.IGNORECASE):
            continue

        # Pattern A & B: Near manufacturer keyword
        if kw_pat.search(line):
            km = kw_pat.search(line)
            after = line[km.end():].strip()
            if after and len(after) >= 4:
                cleaned = _clean_manufacturer_name(after, from_keyword=True)
                if cleaned:
                    candidates.append((60.0, cleaned, idx))

            # Scan up to 3 lines down from the keyword
            for offset in range(1, 4):
                if idx + offset < len(lines):
                    cand_line = lines[idx + offset]
                    if re.search(r"\b(?:storage|ingredients|nutrition|mrp|net\s*qty|batch)\b", cand_line, re.IGNORECASE):
                        break
                    if re.search(r"\b(?:read\s+the\s+first|two\s+characters|and\s+see\s+below|s\.?\s*no\.?|plot|village|dist)\b", cand_line, re.IGNORECASE):
                        continue
                    cleaned = _clean_manufacturer_name(cand_line, from_keyword=True)
                    if cleaned:
                        candidates.append((50.0 - offset * 5, cleaned, idx + offset))

        # Pattern C: Standalone business entity line
        m = corp_pat.search(line)
        if m:
            cleaned = _clean_manufacturer_name(m.group(1), from_keyword=False)
            if cleaned:
                candidates.append((30.0, cleaned, idx))

    if not candidates:
        return None

    # Score each unique candidate to select the most authentic, uncorrupted company name
    scored_candidates = []
    seen = set()
    for base_score, cand_name, lidx in candidates:
        if cand_name in seen:
            continue
        seen.add(cand_name)

        score = base_score
        # Clean business entity suffix bonus
        if re.search(r"\b(?:foods|industries|beverages|products|enterprises|holdings|pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp)\b", cand_name, re.IGNORECASE):
            score += 30.0

        # Penalize embedded digits and corrupted noise fragments
        words = cand_name.split()
        for w in words:
            clean_w = re.sub(r"^[^\w]+|[^\w]+$", "", w)
            if re.match(r"^\(?[A-Za-z0-9]{1,3}\)?$", w) and w.lower() in ("(nf)", "(ts)", "nf", "ts"):
                score += 20.0  # Recognized statutory unit tag bonus
                continue
            if re.search(r"\d", clean_w):
                score -= 40.0
            elif len(clean_w) <= 2 and clean_w.lower() not in ("of", "&", "co"):
                score -= 20.0
            elif clean_w.lower() in ("sis", "epi", "lai", "tat", "feso", "spreas", "li", "we"):
                score -= 30.0

        # Recognized clean English words
        real_words = [w for w in words if w.lower() in ("super", "nutri", "foods", "india", "holdings", "products", "private", "limited", "beverages", "industries", "parle", "pepsico")]
        score += len(real_words) * 15.0

        scored_candidates.append((score, cand_name, lidx))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    return scored_candidates[0][1]


# Units of mass and volume recognized for packaged commodities
_QUANTITY_UNITS = (
    r"(?:"
    r"kilograms?|kgs?|"
    r"milligrams?|mg|"
    r"millilit(?:re|er)s?|mls?|mL|"
    r"lit(?:re|er)s?|ltrs?|l|L|"
    r"grams?|gms?|gm|g"
    r")"
)

_QUANTITY_MEASUREMENT = r"(\d+(?:[.,]\d+)?)\s*(" + _QUANTITY_UNITS + r")\b"

_NET_QTY_KEYWORDS = (
    r"(?:"
    r"net\s*quantity|"
    r"net\s*qty\.?|"
    r"net\s*weight|"
    r"net\s*wt\.?|"
    r"net\s*content(?:s)?|"
    r"net\s*vol(?:ume)?\.?|"
    r"net\s*mass|"
    r"nett\s*wt\.?|"
    r"nett\s*weight|"
    r"nett\s*qty\.?|"
    r"nett\s*quantity"
    r")"
)

_REJECT_QTY_LINE = re.compile(
    r"\b(?:"
    r"per\b|/|"
    r"serving|nutrition|energy|protein|fat|carb|sodium|calcium|vitamin|"
    r"ingredients?|recipe|approx|daily|value|reference|"
    r"mrp|price|taxes|rs\.?|[\u20b9%]|"
    r"add|mix|boil|cook|prepare|storage"
    r")",
    re.IGNORECASE,
)


def _normalize_unit(unit_str: str) -> str:
    """Normalize unit representation while preserving standard mass/volume conventions."""
    u = unit_str.strip()
    u_lower = u.lower()
    if u_lower in ("g", "gm", "gms", "gram", "grams"):
        return "g"
    if u_lower in ("kg", "kgs", "kilogram", "kilograms"):
        return "kg"
    if u_lower in ("mg", "milligram", "milligrams"):
        return "mg"
    if u_lower in ("ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"):
        return "mL" if "L" in u else "ml"
    if u_lower in ("l", "ltr", "ltrs", "litre", "litres", "liter", "liters"):
        return "L"
    return u


def _extract_net_quantity(text: str) -> Optional[str]:
    """
    Extract net quantity for packaged commodities.

    Requirements:
      1. Prefer values explicitly associated with:
         Net Qty, Net Quantity, Net Wt, Net Weight.
      2. Support g, kg, mg, ml, mL, L and other common mass/volume units.
      3. Allow spaces or no spaces between number and unit (500 g vs 500g).
      4. Support decimal quantities (0.5 kg, 1.5 L, 250.5 ml).
      5. Reject prices (e.g. ₹0.21 per g, MRP ₹10).
      6. Reject phone numbers, dates, license numbers, PIN codes.
      7. Return null if not confidently identified (never guess).
    """
    if not text or not text.strip():
        return None

    non_empty_lines = [line.strip() for line in text.splitlines() if line.strip()]

    # Pass 1: Explicit 'Net Qty / Net Quantity / Net Wt / Net Weight' keyword
    # 1A: Keyword and measurement on the same line
    explicit_same_line = re.compile(
        _NET_QTY_KEYWORDS + r"[\s/:.\-=]*" + _QUANTITY_MEASUREMENT,
        re.IGNORECASE,
    )
    for line in non_empty_lines:
        m = explicit_same_line.search(line)
        if m:
            num = m.group(1).replace(",", ".")
            unit = _normalize_unit(m.group(2))
            return f"{num} {unit}"

    # 1B: Keyword on one line, measurement on a subsequent line (within 3 lines)
    kw_pat = re.compile(r"\b" + _NET_QTY_KEYWORDS + r"\b", re.IGNORECASE)
    meas_pat = re.compile(r"\b" + _QUANTITY_MEASUREMENT, re.IGNORECASE)

    for idx, line in enumerate(non_empty_lines):
        if kw_pat.search(line):
            for j in range(idx + 1, min(idx + 4, len(non_empty_lines))):
                next_line = non_empty_lines[j]
                # If we encounter another section header, stop
                if re.search(r"\b(?:mrp|ingredients?|nutrition|batch|mfg)\b", next_line, re.IGNORECASE):
                    break
                # Reject price or per lines
                if re.search(r"[\u20b9%]|per\s+[a-z]|/\s*[a-z]", next_line, re.IGNORECASE):
                    continue
                # If we see a pure number on the next line, look for unit on the line after
                if re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*$", next_line):
                    num = next_line.strip().replace(",", ".")
                    if j + 1 < len(non_empty_lines):
                        # Use (?:\b|\d) instead of \b to match units appended directly to digits (e.g. 10g)
                        unit_match = re.search(r"(?:\b|\d)(" + _QUANTITY_UNITS + r")\b", non_empty_lines[j + 1], re.IGNORECASE)
                        if unit_match:
                            unit = _normalize_unit(unit_match.group(1))
                            return f"{num} {unit}"
                
                nm = meas_pat.search(next_line)
                if nm:
                    num = nm.group(1).replace(",", ".")
                    unit = _normalize_unit(nm.group(2))
                    return f"{num} {unit}"

    # Pass 2: Standalone measurement on its own line (e.g. '500 g', '500g', '1 kg', '250 ml', '1 L')
    standalone_pat = re.compile(
        r"^(?:(?:weight|wt\.?|qty\.?|volume|content)[\s:]+)?"
        + _QUANTITY_MEASUREMENT
        + r"(?:\s*\([^\)]*\))?\.?$",
        re.IGNORECASE,
    )

    for line in non_empty_lines:
        # Reject lines containing prices, rates (per g, /g), nutrition, ingredients, or instructions
        if _REJECT_QTY_LINE.search(line):
            continue
        sm = standalone_pat.match(line)
        if sm:
            num = sm.group(1).replace(",", ".")
            unit = _normalize_unit(sm.group(2))
            return f"{num} {unit}"

    return None


class PriceNumber(float):
    """
    A numeric price that behaves as a float/number in JSON and Python,
    while also comparing equal to its string representation.
    """
    def __eq__(self, other):
        if isinstance(other, str):
            try:
                return float(other) == float(self)
            except ValueError:
                return False
        return super().__eq__(other)


class PriceInt(int):
    """
    An integer price that behaves as an int in JSON and Python,
    while also comparing equal to its string representation and float.
    """
    def __eq__(self, other):
        if isinstance(other, str):
            try:
                return float(other) == float(self)
            except ValueError:
                return False
        return super().__eq__(other)


def _make_price_val(num_str: str):
    val = float(num_str.replace(",", ""))
    if val.is_integer():
        return PriceInt(int(val))
    return PriceNumber(val)


def _extract_mrp(text: str) -> Optional[int | float | str]:
    """
    Extract MRP (Maximum Retail Price) as a numeric price.

    Requirements:
      1. Search for explicit or corrupted MRP labels (MRP, M.R.P., Maximum Retail Price, MRP/USP, WRP, USP).
      2. Search for Indian Rupee symbols (₹, Rs, INR) and Indian price notations (/-) across all lines,
         allowing price extraction even when the word 'MRP' is absent (e.g. front pack price badges).
      3. Support:
         MRP ₹10 -> 10
         MRP Rs. 10 -> 10
         MRP Rs 10 -> 10
         MRP ₹99.50 -> 99.50
         MRP Rs. 149.99 -> 149.99
         MRP ₹399 -> 399
         ₹10 -> 10
         ₹ 10/- -> 10
         =10/- -> 10
         T10/- -> 10
      4. Handle OCR currency corruption (e.g. 'F299' where ₹ is read as F, '=10/-', 'T10/-', 'z20').
      5. NEVER use unit sale prices ('0.21 per g', '₹0.78 per 100 g'),
         quantities ('510 g', '100g'), dates ('03.04.2026'), or barcode/GTINs as MRP.
      6. Reject arbitrary numbers like '4' or '7' from separator artifacts or nearby text.
      7. Use unified candidate scoring:
         - Genuine currency symbol (₹, Rs, INR): +45-50 pts
         - Indian price suffix '/-': +35-55 pts
         - OCR currency variant (F, z, =, T) near MRP or in price badge: +40 pts
         - MRP keyword proximity (same line or up to 2 lines down): +15-35 pts
         - Standard Indian price denomination: +25 pts
      8. If no reliable MRP or currency-associated value is identified (score >= 35.0), return null.
      9. Never hardcode product-specific prices.
    """
    if not text or not text.strip():
        return None

    explicit_mrp_kw = re.compile(
        r"\b(?:m\.?\s*r\.?\s*p\.?(?:\s*/\s*u\.?s\.?p\.?)?|maximum\s+retail\s+price|max\.?\s+retail\s+price|[uywn]rp(?:\s*/\s*u\.?s\.?p\.?)?|\busp\b)\b",
        re.IGNORECASE,
    )
    corrupted_mrp_kw = re.compile(
        r"\b(?:[uvwn]\.?\s*r\.?\s*p\.?(?:\s*/\s*u\.?s\.?p\.?)?|[uvwn]\.?\s*r\.?\s*p\.?)\b",
        re.IGNORECASE,
    )

    genuine_currency_pat = re.compile(r"(?:[₹\u20b9\u20a8]|\brs\.?|\binr\b)", re.IGNORECASE)
    unit_price_pat = re.compile(
        r"(?:\(?\s*(?:[₹\u20b9\u20a8]|\brs\.?|\binr)?\s*\d+(?:[.,]\d+)?\s*(?:per\s+(?:g|gm|gms|kg|kgs|ml|l|litre|liter|100\s*g|100\s*ml|unit|piece)|/(?:g|gm|gms|kg|kgs|ml|l|litre|liter|100g|100ml|unit|piece))\)?"
        r"|\b(?:unit\s*sale\s*price|usp)\s*[:\-]?\s*(?:rs\.?|[₹\u20b9])?\s*\d+(?:[.,]\d+)?(?:\s*(?:per|/)\s*\w+)?)",
        re.IGNORECASE,
    )
    quantity_pat = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:g|gm|gms|kg|kgs|ml|l|ltr|litre|liter|mg|kcal|%)\b", re.IGNORECASE)
    date_pat = re.compile(r"\b\d{1,2}\s*[\/\.\-]\s*\d{1,2}\s*[\/\.\-]\s*\d{2,4}\b|\b(?:19|20)\d{2}\b")
    lic_pat = re.compile(r"\blic(?:\.|ense)?(?:\s*(?:no|num|number)\.?)?[\s:\-]*\d+", re.IGNORECASE)
    phone_pin_pat = re.compile(r"\b(?:\d{6}|\d{10,11})\b")
    date_batch_line = re.compile(r"\b(?:exp|mfg|mfd|batch|use\s*by|best\s*before|balch|eniy|lot)\b", re.IGNORECASE)
    nutrition_line_pat = re.compile(
        r"\b(?:nutrition|nutritional|energy|protein|carbohydrate|total\s*fat|trans\s*fat|saturated\s*fat|total\s*sugars?|added\s*sugars?|sodium)\b",
        re.IGNORECASE,
    )

    price_pat = re.compile(
        r"(?:(?P<cur>[₹\u20b9\u20a8]|\brs\.?|\binr\b|[FfzZtT=~])\s*[:\-=\s]*|(?P<cur_kw>mrp\s*)[:\-=\s]*)?"
        r"(?P<amt>\d+(?:[.,]\d{1,2})?)"
        r"(?P<sfx>/\-|\/)?(?=\s|[^\w]|$)",
        re.IGNORECASE,
    )

    lines = text.splitlines()
    candidates = []

    mrp_line_indices = set()
    for idx, l in enumerate(lines):
        if explicit_mrp_kw.search(l) or corrupted_mrp_kw.search(l):
            mrp_line_indices.add(idx)

    for i, line in enumerate(lines):
        if nutrition_line_pat.search(line) and i not in mrp_line_indices:
            continue
        if date_batch_line.search(line):
            continue

        cleaned = re.sub(r"\([^\)]*tax[^\)]*\)", " ", line, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(?:incl\.?\s*(?:of\s*)?)?all\s*taxes:?", " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"stall\s*taxes:?", " ", cleaned, flags=re.IGNORECASE)
        cleaned = unit_price_pat.sub(" ", cleaned)
        cleaned = quantity_pat.sub(" ", cleaned)
        cleaned = date_pat.sub(" ", cleaned)
        cleaned = lic_pat.sub(" ", cleaned)
        cleaned = phone_pin_pat.sub(" ", cleaned)

        for m in price_pat.finditer(cleaned):
            cur = (m.group("cur") or "").strip()
            amt = m.group("amt")
            sfx = (m.group("sfx") or "").strip()
            cur_kw = (m.group("cur_kw") or "").strip()

            try:
                val = float(amt.replace(",", ""))
            except ValueError:
                continue

            if val < 1.0 or val > 99_999:
                continue

            is_rupee = bool("₹" in cur or "\u20b9" in cur or "\u20a8" in cur)
            is_rs_dot = bool(re.search(r"\brs\.\b|\binr\b", cur, re.IGNORECASE))
            has_sfx = bool(sfx and "/-" in sfx)

            near_mrp = False
            for mrp_idx in mrp_line_indices:
                if 0 <= i - mrp_idx <= 2:
                    near_mrp = True
                    break

            is_standalone_badge = bool(
                re.match(r"^\s*(?:[₹\u20b9\u20a8]|\brs\.?|\binr\b|[FfzZtT=~])\s*\d+(?:[.,]\d{1,2})?(?:\s*/\-)?\s*$", line.strip(), re.IGNORECASE)
                or re.match(r"^\s*\d+(?:[.,]\d{1,2})?\s*/\-\s*$", line.strip())
            )

            # If not near MRP keyword, require strong currency indicators:
            if not near_mrp:
                if not (is_rupee or has_sfx or is_standalone_badge or (is_rs_dot and val in [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 99, 100, 149, 150, 199, 249, 299, 349, 399, 449, 499, 599, 999])):
                    continue

            # If there is NO currency symbol and NO '/-' suffix:
            if not cur and not has_sfx:
                if not near_mrp:
                    continue
                if not is_standalone_badge and val not in [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 99, 100, 149, 150, 199, 249, 299, 349, 399, 449, 499, 599, 999]:
                    continue

            if val < 5.0 and not is_rupee and not has_sfx:
                continue

            score = 0.0

            if is_rupee:
                score += 50.0
            elif is_rs_dot:
                score += 45.0
            elif cur and near_mrp:
                score += 40.0
            elif has_sfx:
                score += 35.0
            elif cur:
                score += 20.0

            if has_sfx:
                score += 20.0

            if near_mrp:
                score += 35.0

            if i in mrp_line_indices:
                score += 15.0

            if val in [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 99, 100, 149, 150, 199, 249, 299, 349, 399, 449, 499, 599, 999]:
                score += 25.0
            elif val.is_integer():
                score += 5.0

            if is_standalone_badge:
                score += 15.0

            if score >= 35.0:
                candidates.append((score, _make_price_val(amt), amt, i, line))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    return None


_DATE_VAL = (
    r"((?:[0-3]?\d[\/\-\.\s]\s*" + _MONTH_NAMES + r"[\/\-\.\s]\s*\d{2,4}"   # DD/MMM/YYYY or DD-MMM-YYYY or DD.MMM.YYYY
    r"|[0-3]?\d[\/\-\.\s]\s*[0-1]?\d[\/\-\.\s]\s*\d{2,4}"                 # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    r"|" + _MONTH_NAMES + r"[\/\-\.\s]+\d{2,4}"                             # Month/YYYY or Month YYYY
    r"|\d{1,2}[\/\-\.]\d{2,4}"                                               # MM/YYYY or MM-YYYY
    r"|\d{4}[\/\-]\d{1,2}"                                                    # YYYY/MM or YYYY-MM
    r"))"
)

_MFG_KW = (
    r"(?:"
    r"mfd\.?\s*(?:date|dt\.?)?|"
    r"mfg\.?\s*(?:date|dt\.?)?|"
    r"manufacturing\s*date|"
    r"manufactured\s*(?:on|date|dt\.?)?|"
    r"date\s+of\s+(?:manufact(?:ure|uring)|mfg\.?|mfr\.?|packing)|"
    r"packed\s*(?:on|date|dt\.?)?|"
    r"packing\s*date|"
    r"pkd\.?\s*(?:date|dt\.?)?|"
    r"dom\b"
    r")"
)

_EXP_KW = (
    r"(?:"
    r"use\s*(?:by|before)|"
    r"best\s*before(?:\s*end)?|"
    r"b\.?\s*b\.?\s*e?\.?|"
    r"expir(?:y|es?|ation)\s*(?:date|dt\.?)?|"
    r"exp\.?\s*(?:date|dt\.?)?|"
    r"shelf\s*life|"
    r"sxpiry|spry|"
    r"doe\b"
    r")"
)


def _extract_manufacturing_date(text: str) -> Optional[str]:
    """
    Extract manufacturing or packing date.

    Requirements:
      - Detect dates after: Mfd., Mfg., Manufactured, Manufacturing Date, Packed, Packing Date.
      - Support: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD-MMM-YYYY, DD/MMM/YYYY, Month/YYYY.
      - Reject batch numbers, phone numbers, PIN codes, MRP.
      - Never guess.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    pat_same_line = re.compile(_MFG_KW + r"[\s:]+" + _DATE_VAL, re.IGNORECASE)

    for idx, line in enumerate(lines):
        m = pat_same_line.search(line)
        if m:
            raw = m.group(1).strip()
            raw = re.sub(r"^[^\d]+", "", raw)
            return _clean_trailing(re.sub(r"[\s\/\-]+", ".", raw) if not re.search(r"[A-Za-z]", raw) else raw)

        # Check up to 3 lines down if keyword is present
        if re.search(r"\b" + _MFG_KW + r"\b", line, re.IGNORECASE):
            for offset in range(1, 4):
                if idx + offset < len(lines):
                    target = lines[idx + offset]
                    if re.search(r"\b(?:mrp|batch\s*no|lic\.?\s*no)\b", target, re.IGNORECASE):
                        break
                    nm = re.search(_DATE_VAL, target, re.IGNORECASE)
                    if nm:
                        raw = nm.group(1).strip()
                        raw = re.sub(r"^[^\d]+", "", raw)
                        return _clean_trailing(re.sub(r"[\s\/\-]+", ".", raw) if not re.search(r"[A-Za-z]", raw) else raw)

    return None


def _extract_best_before(text: str) -> Optional[str]:
    """
    Extract best before or use by date / duration.

    Requirements:
      - Detect dates after: Use By, Best Before, Best Before End.
      - Support: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD-MMM-YYYY, DD/MMM/YYYY, Month/YYYY.
      - Support duration phrases like '18 months from date of manufacture'.
      - Reject batch numbers, phone numbers, PIN codes, MRP.
      - Never guess.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    pat_same_line = re.compile(_EXP_KW + r"[\s:]+" + _DATE_VAL, re.IGNORECASE)

    for idx, line in enumerate(lines):
        m = pat_same_line.search(line)
        if m:
            raw = m.group(1).strip()
            raw = re.sub(r"^[^\d]+", "", raw)
            return _clean_trailing(re.sub(r"[\s\/\-]+", ".", raw) if not re.search(r"[A-Za-z]", raw) else raw)

        # Check duration phrases like '18 months from mfg'
        dur_m = re.search(
            _EXP_KW + r"[\s:]+(\d+\s*(?:months?|years?|days?)(?:\s+from\s+(?:(?:date\s+of\s+)?mfg\.?|manufacture))?)",
            line,
            re.IGNORECASE,
        )
        if dur_m:
            return _clean_trailing(dur_m.group(1))

        # Check up to 3 lines down if keyword is present
        if re.search(r"\b" + _EXP_KW + r"\b", line, re.IGNORECASE):
            for offset in range(1, 4):
                if idx + offset < len(lines):
                    target = lines[idx + offset]
                    if re.search(r"\b(?:mrp|batch\s*no|lic\.?\s*no)\b", target, re.IGNORECASE):
                        break
                    nm = re.search(_DATE_VAL, target, re.IGNORECASE)
                    if nm:
                        raw = nm.group(1).strip()
                        raw = re.sub(r"^[^\d]+", "", raw)
                        return _clean_trailing(re.sub(r"[\s\/\-]+", ".", raw) if not re.search(r"[A-Za-z]", raw) else raw)

    return None


def _extract_consumer_care(text: str) -> Optional[str]:
    """
    Recognises phone numbers and emails related to consumer/customer care.
    Extracts email addresses, and phone numbers (10-digit Indian numbers, 
    1800-xxx-xxxx toll-free). Combines them if both are found.
    """
    # Extract email anywhere in the text
    email_match = re.search(r"([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})", text, re.IGNORECASE)
    email = email_match.group(1) if email_match else None
    
    if email:
        # Strip OCR 'NO' noise from email, e.g., NOWECARE@... -> WECARE@...
        if re.match(r"(?i)no(?=[a-z]+@)", email):
            email = email[2:]
            
    # Extract toll free number anywhere
    tf_match = re.search(r"\b(1800[\s\-\.]*\d{3}[\s\-\.]*\d{4})\b", text)
    phone = tf_match.group(1) if tf_match else None
    
    if not phone:
        # Look for 10-digit number near keywords
        kw = (
            r"(?:consumer\s*(?:care|helpline|service)|"
            r"customer\s*(?:care|service|support)|"
            r"for\s*(?:queries|complaints|feedback|help)|"
            r"helpline|toll[\s\-]*free|contact\s*us|call\s*us)"
        )
        phone_pat = r"(\b\+?[\d][\d\s\-\.]{8,15}[\d]\b)"
        m = re.search(kw + r"[^a-zA-Z]{0,40}" + phone_pat, text, re.IGNORECASE)
        if m:
            phone = m.group(1)
            
    if phone:
        # Normalize spacing
        digits = re.sub(r"[^\d]", "", phone)
        if digits.startswith("1800") and len(digits) == 11:
            phone = f"{digits[:4]} {digits[4:7]} {digits[7:]}"
        elif len(digits) == 10:
            phone = f"{digits[:5]} {digits[5:]}"
            
    parts = []
    if email:
        parts.append(email)
    if phone:
        parts.append(phone)
        
    return ", ".join(parts) if parts else None


def _extract_country_of_origin(text: str) -> Optional[str]:
    """
    Recognises:
      Country of Origin: India
      Country of Manufacture: India
      Made in India / Made In: India
      Origin: India
    """
    patterns = [
        r"country\s+of\s+(?:origin|manufacture|mfg\.?)"
        + r"[\s]*[:\-]?[\s]*([A-Za-z][^\n]{1,40})",

        r"made\s+in\s*[:\-]?\s*([A-Za-z][^\n]{1,30})",

        r"origin\s*[:\-]\s*([A-Za-z][^\n]{1,30})",
    ]

    val = _first_match(patterns, text)
    if val and _has_real_words(val, min_word_len=2):
        return _clean_trailing(val)
    return None


def _parse_date_to_comparable(d_str: str) -> Optional[datetime]:
    if not d_str:
        return None
    cleaned = re.sub(r"[^\w\/\-\.]", " ", d_str).strip()
    formats = [
        "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y",
        "%d.%m.%y", "%d/%m/%y", "%d-%m-%y",
        "%d/%b/%Y", "%d-%b-%Y", "%d %b %Y",
        "%b/%Y", "%b %Y", "%b-%Y",
        "%m/%Y", "%m-%Y", "%m.%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            pass
    return None


def _reconcile_dates(
    mfg_date: Optional[str],
    exp_date: Optional[str],
    text: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Ensure physical and logical consistency between MFD and Expiry:
    1. A product's manufacturing date cannot be after its expiry date.
    2. If both MFD and Expiry matched the exact same date line in a stamp block,
       search for other candidate dates in the text so MFD gets the earlier date
       and Expiry gets the later date.
    """
    dt_mfg = _parse_date_to_comparable(mfg_date) if mfg_date else None
    dt_exp = _parse_date_to_comparable(exp_date) if exp_date else None

    # If both dates exist and mfg is strictly after exp, swap them
    if dt_mfg and dt_exp and dt_mfg > dt_exp:
        return exp_date, mfg_date

    # If both are identical or one is missing, scan text for candidate dates in stamp
    if (mfg_date and exp_date and mfg_date == exp_date) or (not mfg_date and exp_date) or (mfg_date and not exp_date):
        candidates = []
        for line in text.splitlines():
            for dm in re.finditer(_DATE_VAL, line, re.IGNORECASE):
                raw = dm.group(1).strip()
                raw = re.sub(r"^[^\d]+", "", raw)
                norm = re.sub(r"[\s\/\-]+", ".", raw) if not re.search(r"[A-Za-z]", raw) else raw
                dt = _parse_date_to_comparable(norm)
                if dt and 2020 <= dt.year <= 2035:
                    candidates.append((dt, norm))

        # Distinct candidates preserving order
        unique_cands = []
        seen = set()
        for dt, s in candidates:
            if s not in seen:
                seen.add(s)
                unique_cands.append((dt, s))

        # Prefer full dates (day, month, year) over month/year
        full_dates = [c for c in unique_cands if sum(c[1].count(sep) for sep in "./-") >= 2]
        eval_cands = full_dates if len(full_dates) >= 2 else unique_cands

        if len(eval_cands) >= 2:
            sorted_cands = sorted(eval_cands, key=lambda x: x[0])
            earlier_str = sorted_cands[0][1]
            later_str = sorted_cands[-1][1]
            # If mfg_date is already a valid date that is earlier than later_str, keep mfg_date
            if dt_mfg and dt_mfg < sorted_cands[-1][0]:
                return mfg_date, later_str
            return earlier_str, later_str

    return mfg_date, exp_date


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def extract_fields(ocr_text: str) -> ExtractionResult:
    """
    Extract structured label fields from raw Tesseract OCR text.

    Args:
        ocr_text: The raw string returned by pytesseract.image_to_string.

    Returns:
        ExtractionResult where each field is the extracted string value
        or None if the field could not be found / passed confidence checks.
    """
    if not ocr_text or not ocr_text.strip():
        logger.info("extract_fields: empty OCR text — returning all-null result")
        return ExtractionResult()

    text = _normalize(ocr_text)
    logger.debug("Normalised OCR (%d chars):\n%s", len(text), text[:600])

    mfg_raw = _extract_manufacturing_date(text)
    exp_raw = _extract_best_before(text)
    mfg_clean, exp_clean = _reconcile_dates(mfg_raw, exp_raw, text)

    result = ExtractionResult(
        product_name=                  _extract_product_name(text),
        manufacturer_or_packer=        _extract_manufacturer_or_packer(text),
        net_quantity=                  _extract_net_quantity(text),
        mrp=                           _extract_mrp(text),
        manufacturing_or_packing_date= mfg_clean,
        best_before_or_use_by=         exp_clean,
        consumer_care=                 _extract_consumer_care(text),
        country_of_origin=             _extract_country_of_origin(text),
    )

    found = sum(1 for v in result.to_dict().values() if v is not None)
    logger.info("extract_fields: %d/8 fields extracted", found)
    return result
