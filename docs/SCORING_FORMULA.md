# Scoring Formula

## Overview

The Massachusetts Solar + Mass Save Lead Bot assigns each lead a **Fit Score** from 0-100. This score helps prioritize outreach by identifying properties most likely to benefit from solar installation or Mass Save energy efficiency programs.

## Default Scoring Weights

| Factor | Default Weight | Max Points |
|--------|---------------|------------|
| Property Type | 20 | 20 |
| Square Feet | 15 | 15 |
| Home Age | 15 | 15 |
| Assessed Value | 15 | 15 |
| Owner Occupied | 20 | 20 |
| Data Completeness | 10 | 10 |
| **Total** | **95** | **95** |

*Note: Actual scores may exceed individual weights due to normalization*

---

## Factor Details

### 1. Property Type (Default: 20 points)

Single-family homes receive the highest score as they:
- Have dedicated roof space for solar
- Allow homeowner decision-making without HOA/condo board
- Often have larger energy consumption

| Type | Points |
|------|--------|
| Single Family | 20 (full weight) |
| Multi Family | 10 (50% of weight) |
| Condo | 5 (25% of weight) |
| Unknown | 0 |

### 2. Square Feet (Default: 15 points)

Larger homes typically:
- Have higher energy consumption (more savings potential)
- Have more roof space for solar
- Indicate higher homeowner investment capacity

**Formula:** Linear normalization between 800-4000 sqft
```
score = ((sqft - 800) / (4000 - 800)) * weight
score = clamp(score, 0, weight)
```

| Sqft | Points (15 weight) |
|------|-------------------|
| < 800 | 0 |
| 1,400 | ~3 |
| 2,000 | ~6 |
| 3,000 | ~10 |
| 4,000+ | 15 |

### 3. Home Age (Default: 15 points)

Older homes (but not too old) often need:
- Insulation upgrades
- HVAC replacement
- Window improvements
- General energy efficiency retrofits

**Sweet Spot:** Homes built 1950-2000 (25-75 years old)

| Age Range | Multiplier | Reasoning |
|-----------|------------|-----------|
| 25-75 years | 100% | Prime for efficiency upgrades |
| > 75 years | 70% | May have historical restrictions |
| 15-24 years | 50% | Moderate upgrade potential |
| < 15 years | 20% | Likely already efficient |

**Formula:**
```
if age >= 25 && age <= 75:
    multiplier = 1.0
elif age > 75:
    multiplier = 0.7
elif age >= 15:
    multiplier = 0.5
else:
    multiplier = 0.2

score = multiplier * weight
```

### 4. Assessed Value (Default: 15 points)

Higher value properties indicate:
- Greater homeowner investment capacity
- Likely higher energy bills (larger savings)
- More likely to invest in improvements

**Formula:** Linear normalization between $200K-$1M
```
score = ((value - 200000) / (1000000 - 200000)) * weight
score = clamp(score, 0, weight)
```

| Value | Points (15 weight) |
|-------|-------------------|
| < $200K | 0 |
| $400K | ~4 |
| $600K | ~8 |
| $800K | ~11 |
| $1M+ | 15 |

### 5. Owner Occupied (Default: 20 points)

Owner-occupied properties are preferred because:
- Owner can make decisions without landlord approval
- More likely to invest in long-term improvements
- Can directly benefit from utility savings

| Status | Points |
|--------|--------|
| Owner Occupied (confirmed) | 20 (full weight) |
| Not Owner Occupied | 6 (30% of weight) |
| Unknown | 10 (50% of weight) |

**Detection Method:** Compare property address to owner mailing address. If they match (after normalization), mark as owner-occupied.

### 6. Data Completeness (Default: 10 points)

Leads with more complete data can be:
- Better qualified before contact
- More accurately scored
- More confidently prioritized

**Fields Checked:**
1. Address
2. City
3. ZIP Code
4. Property Type
5. Year Built
6. Square Feet
7. Assessed Value
8. Owner Name
9. Owner Occupied Status

**Formula:**
```
completeness = fields_present / total_fields
score = completeness * weight
```

| Completeness | Points (10 weight) |
|--------------|-------------------|
| 100% | 10 |
| 80% | 8 |
| 60% | 6 |
| 40% | 4 |

---

## Program Fit Flags

In addition to the overall score, leads are flagged for specific programs:

### Solar Candidate
Requirements (configurable):
- Square feet >= 1,200 (roof space)
- Assessed value >= $150,000 (financing capacity)
- Property type: single_family or multi_family

### Mass Save Candidate
Requirements (configurable):
- Year built <= 2010 (older homes benefit more)
- Square feet >= 800 (sufficient to warrant assessment)

---

## Suggested Actions

Based on the score, leads receive action recommendations:

| Score Range | Action | Rationale |
|-------------|--------|-----------|
| 70-100 | Knock | High priority - door knock |
| 50-69 (owner-occupied) | Knock | Good prospect, worth personal visit |
| 50-69 (other) | Mailer | Send information mailer |
| 30-49 | Mailer | Lower priority mailer |
| 0-29 | Wait | Wait for more data/better timing |

---

## Customizing the Formula

### Via config.yaml

```yaml
scoring:
  single_family_weight: 25    # Increase property type weight
  sqft_weight: 10             # Decrease size weight
  age_weight: 20              # Increase age importance
  value_weight: 10            # Decrease value weight
  owner_occupied_weight: 25   # Increase owner-occupied importance
  data_completeness_weight: 5 # Decrease data completeness
```

### Via Dashboard

1. Go to Settings page
2. Adjust sliders for each factor
3. Click Save Changes
4. Re-run scoring via Pipeline page

---

## Score Interpretation

| Score | Interpretation |
|-------|----------------|
| 80-100 | Excellent prospect - prioritize contact |
| 60-79 | Good prospect - worth pursuing |
| 40-59 | Moderate prospect - consider for campaigns |
| 20-39 | Lower priority - include in broad outreach |
| 0-19 | Low fit - wait or skip |

---

## Example Calculation

**Property:**
- Single family home
- 2,200 sqft
- Built 1975 (49 years old)
- $450,000 assessed value
- Owner-occupied
- 8/9 data fields present

**Calculation:**
```
Property Type:     20 (single family)
Square Feet:       9  ((2200-800)/(4000-800) * 15 = 6.6, rounded)
Home Age:          15 (49 years = 100% multiplier)
Assessed Value:    5  ((450000-200000)/(1000000-200000) * 15 = 4.7)
Owner Occupied:    20 (confirmed owner-occupied)
Data Completeness: 9  (8/9 * 10 = 8.9)

TOTAL:             78
```

**Result:** Score 78 - Good prospect, suggested action: Knock
