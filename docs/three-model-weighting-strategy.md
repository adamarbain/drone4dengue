# Three-Model Prediction Weighting Strategy

## Overview

The three-model prediction system combines scores from different models that measure different aspects of dengue risk:

1. **Model 1 (Historical Cases)**: Predicts based on past dengue case patterns
2. **Model 2 (Weather-Based)**: Predicts based on current weather conditions
3. **Model 3 (Breeding Area Detection)**: Detects actual mosquito breeding sites in drone images

## Score Normalization

### Model Score Ranges

| Model | Score Range | Description |
|-------|-------------|-------------|
| Model 1 | 0-5 | Predicted case count (historical trends) |
| Model 2 | 0-5 | Risk score based on weather conditions |
| Model 3 | 0-1 | Probability of breeding area detection |

### Normalization Formula

All models are normalized to 0-1 range before combination:

```python
# Model 1 & 2: Divide by maximum score (5)
model1_normalized = model1_score / 5.0  # 0-5 → 0-1
model2_normalized = model2_score / 5.0  # 0-5 → 0-1
model3_normalized = model3_score        # Already 0-1
```

**Important**: Previously, the code incorrectly divided by 10.0. This has been fixed to divide by 3.0.

## Weighting Scheme

### Current Weights (Recommended)

```
Model 1 (Historical):  35%  (0.35)
Model 2 (Weather):     30%  (0.30)
Model 3 (Breeding):    35%  (0.35)
```

### Rationale

1. **Model 1 (40%) - Historical Cases**
   - **Why highest weight**: Most reliable long-term predictor
   - **Advantages**: 
     - Based on actual historical case data
     - Captures seasonal patterns and trends
     - Less volatile than weather
   - **Reliability**: High - based on real disease occurrence data

2. **Model 2 (35%) - Weather Conditions**
   - **Why second highest**: Critical for immediate risk
   - **Advantages**:
     - Temperature, humidity, rainfall directly affect mosquito breeding
     - Captures current environmental conditions
     - Can predict short-term risk spikes
   - **Limitations**: Weather can change rapidly

3. **Model 3 (25%) - Breeding Area Detection**
   - **Why lowest (but still significant)**: Strong evidence when available
   - **Advantages**:
     - Direct visual evidence of breeding sites
     - Most actionable (shows where to intervene)
     - High confidence when detected
   - **Limitations**: 
     - Requires drone images (not always available)
     - May miss underground or hidden breeding sites

## Combined Score Calculation

### Formula

```python
# Step 1: Normalize all scores to 0-1
model1_normalized = model1_score / 5.0
model2_normalized = model2_score / 5.0
model3_normalized = model3_score  # Already 0-1

# Step 2: Weighted combination
combined_score_normalized = (
    0.35 * model1_normalized + 
    0.30 * model2_normalized + 
    0.35 * model3_normalized
)

# Step 3: Scale back to 0-5 for consistency
combined_score = combined_score_normalized * 5.0
```

### Output

- **combined_score**: 0-3 range (for compatibility with existing system)
- **combined_score_normalized**: 0-1 range (for reference)

## Risk Level Thresholds

Based on 0-3 scale (matching two-model prediction):

| Risk Level | Threshold | Normalized Equivalent |
|------------|-----------|----------------------|
| **High** | ≥ 2.1 | ≥ 0.7 |
| **Medium** | ≥ 1.2 | ≥ 0.4 |
| **Low** | < 1.2 | < 0.4 |

## Alternative Weighting Strategies

### Option 1: Balanced Approach
```
Model 1: 33.3%
Model 2: 33.3%
Model 3: 33.3%
```
**Use case**: When all three models are equally reliable and available

### Option 2: Historical-Focused
```
Model 1: 50%
Model 2: 30%
Model 3: 20%
```
**Use case**: When historical data is most reliable and weather is variable

### Option 3: Evidence-Based
```
Model 1: 35%
Model 2: 30%
Model 3: 35%
```
**Use case**: When visual breeding area detection is highly reliable and available

### Option 4: Current Conditions Emphasis
```
Model 1: 30%
Model 2: 40%
Model 3: 30%
```
**Use case**: During weather events or when current conditions are most predictive

## Examples

### Example 1: High Risk
```
Model 1 Score: 2.5 (Historical) → Normalized: 0.83
Model 2 Score: 2.8 (Weather)   → Normalized: 0.93
Model 3 Score: 0.9 (Breeding)   → Normalized: 0.90

Combined (normalized): 
  0.40 * 0.83 + 0.35 * 0.93 + 0.25 * 0.90 = 0.87

Combined (0-3 scale): 0.87 * 3 = 2.61
Risk Level: HIGH (≥ 2.1)
```

### Example 2: Medium Risk
```
Model 1 Score: 1.5 (Historical) → Normalized: 0.50
Model 2 Score: 1.2 (Weather)   → Normalized: 0.40
Model 3 Score: 0.5 (Breeding)   → Normalized: 0.50

Combined (normalized): 
  0.40 * 0.50 + 0.35 * 0.40 + 0.25 * 0.50 = 0.47

Combined (0-3 scale): 0.47 * 3 = 1.41
Risk Level: MEDIUM (≥ 1.2)
```

### Example 3: Low Risk
```
Model 1 Score: 0.3 (Historical) → Normalized: 0.10
Model 2 Score: 0.6 (Weather)   → Normalized: 0.20
Model 3 Score: 0.2 (Breeding)   → Normalized: 0.20

Combined (normalized): 
  0.40 * 0.10 + 0.35 * 0.20 + 0.25 * 0.20 = 0.16

Combined (0-3 scale): 0.16 * 3 = 0.48
Risk Level: LOW (< 1.2)
```

## Adjusting Weights

To adjust weights, modify the values in `prediction_service.py`:

```python
# Current weights (lines 600-602)
combined_score_normalized = (
    0.40 * model1_normalized + 
    0.35 * model2_normalized + 
    0.25 * model3_normalized
)

# Ensure weights sum to 1.0
# Example: More emphasis on historical data
combined_score_normalized = (
    0.50 * model1_normalized +  # Increased from 0.40
    0.30 * model2_normalized +  # Decreased from 0.35
    0.20 * model3_normalized    # Decreased from 0.25
)
```

## Validation

The weighting should be validated against:
1. **Historical accuracy**: Compare predictions to actual outbreaks
2. **Clinical feedback**: Expert review of risk level assignments
3. **A/B testing**: Test different weight combinations
4. **Regional variations**: Weights may need adjustment by geographic area

## Monitoring

Track these metrics to evaluate weighting effectiveness:
- **Prediction accuracy**: How well combined score predicts actual cases
- **False positive rate**: Over-prediction of high risk
- **False negative rate**: Under-prediction of high risk
- **Model contribution**: Which model most often drives the final score

## Recommendations

1. **Start with current weights** (40/35/25) - based on model reliability
2. **Monitor performance** for 3-6 months
3. **Adjust based on data**:
   - If historical patterns are very strong → increase Model 1 weight
   - If weather is highly predictive → increase Model 2 weight
   - If breeding area detection is very accurate → increase Model 3 weight
4. **Consider regional variations**: Different areas may benefit from different weights

---

**Last Updated**: After Firebase Storage migration
**Current Weights**: Model 1 (40%), Model 2 (35%), Model 3 (25%)
**Normalization**: Model 1 & 2 divided by 3.0 (max score), Model 3 already 0-1

