# Token Allocation Analysis for Subscription Pricing

## Pricing Structure

### Monthly Subscription: $20 USD
### Yearly Subscription: $192 USD ($16/month, 20% discount)

### Token Pricing (per 1M tokens):
- **Input tokens:**
  - ≤200k tokens: $2.00
  - >200k tokens: $4.00

- **Output tokens (including thinking tokens):**
  - ≤200k tokens: $12.00
  - >200k tokens: $18.00

- **Context caching:**
  - ≤200k tokens: $0.20
  - >200k tokens: $0.40

- **Storage:** $4.50 / 1M tokens per hour

## Cost Analysis

### Scenario 1: Small Prompts (≤200k tokens)
**Typical request composition:**
- Input: 50k tokens
- Output: 20k tokens  
- Context caching: 10k tokens
- **Total: ~80k tokens per request**

**Cost per request:**
- Input: 0.05M × $2.00 = $0.10
- Output: 0.02M × $12.00 = $0.24
- Context: 0.01M × $0.20 = $0.002
- **Total: ~$0.342 per request**

**With $20/month:**
- Requests: $20 ÷ $0.342 ≈ **58 requests/month**
- Tokens: 58 × 80k = **4.64M tokens/month**

### Scenario 2: Large Prompts (>200k tokens)
**Typical request composition:**
- Input: 300k tokens
- Output: 100k tokens
- Context caching: 50k tokens
- **Total: ~450k tokens per request**

**Cost per request:**
- Input: 0.3M × $4.00 = $1.20
- Output: 0.1M × $18.00 = $1.80
- Context: 0.05M × $0.40 = $0.02
- **Total: ~$3.02 per request**

**With $20/month:**
- Requests: $20 ÷ $3.02 ≈ **6-7 requests/month**
- Tokens: 6.5 × 450k = **2.93M tokens/month**

### Scenario 3: Mixed Usage (Recommended Calculation)
**Assumption:** 70% small prompts, 30% large prompts

**Weighted average cost per 1M tokens:**
- Small tier: ~$4.28 per 1M tokens (blended rate)
- Large tier: ~$6.71 per 1M tokens (blended rate)
- Mixed: (0.7 × $4.28) + (0.3 × $6.71) = **$5.01 per 1M tokens**

**With $20/month:**
- Token allocation: $20 ÷ $5.01 ≈ **4.0M tokens/month**

## Recommended Token Allocations

### Option 1: Conservative (3.5M tokens/month)
- **Rationale:** Accounts for storage costs, overhead, and ensures profitability
- **Monthly:** 3.5M tokens
- **Yearly:** 3.5M tokens/month (same monthly allocation)
- **Good for:** Ensuring sustainable margins

### Option 2: Balanced (4.0M tokens/month) ⭐ **RECOMMENDED**
- **Rationale:** Matches calculated mixed usage scenario, good value for users
- **Monthly:** 4.0M tokens
- **Yearly:** 4.0M tokens/month (same monthly allocation)
- **Good for:** Competitive pricing while maintaining profitability

**Prompt Capacity (4.0M tokens):**
- **All small prompts (≤200k):** 4.0M ÷ 80k = **~50 prompts/month**
- **All large prompts (>200k):** 4.0M ÷ 450k = **~9 prompts/month**
- **Mixed usage (70% small, 30% large):** 
  - 70% of 4.0M = 2.8M tokens for small prompts = 35 prompts
  - 30% of 4.0M = 1.2M tokens for large prompts = ~2.7 prompts
  - **Total: ~37-38 prompts/month**

### Option 3: Generous (5.0M tokens/month)
- **Rationale:** Assumes mostly small prompts, maximum user value
- **Monthly:** 5.0M tokens
- **Yearly:** 5.0M tokens/month (same monthly allocation)
- **Good for:** Aggressive user acquisition, assuming low average usage

## Additional Considerations

### Storage Costs
- Storage is billed per hour, not included in token allocation
- Consider: 1M tokens stored for 1 hour = $4.50
- **Recommendation:** Include storage separately or add 10-15% buffer to token allocation

### Token Reset Strategy
- **Monthly reset:** Tokens reset each billing cycle
- **Rollover:** Consider allowing 20-30% rollover to next month (optional)
- **Yearly plans:** Could offer 10-15% bonus tokens (e.g., 4.4M tokens/month)

## Final Recommendation

### Monthly Plan: **4.0M tokens/month**
- Provides good value for typical usage patterns
- Accounts for mixed prompt sizes
- Leaves room for storage and overhead costs

### Yearly Plan: **4.4M tokens/month** (10% bonus)
- Rewards annual commitment
- Still maintains healthy margins
- Competitive with monthly plan value

### Free Tier
- **0 tokens** (as specified - not available)
- Users must use BYOK (Bring Your Own Key) or upgrade

## Credit Top-Up Analysis

### Pricing Strategy for Top-Ups
Top-ups should be **slightly less cost-effective** than subscriptions to incentivize monthly/annual subscriptions:
- **Subscription:** $20 for 4.0M tokens = **$5.00 per 1M tokens**
- **Top-ups:** Should be ~$5.50-6.00 per 1M tokens (10-20% premium)

### Recommended Top-Up Products

#### Option A: Tiered Top-Ups (Recommended)
Based on $5.50 per 1M tokens (10% premium over subscription):

| Price | Tokens | Price per 1M | Prompts (small) | Prompts (large) | Prompts (mixed) |
|-------|--------|--------------|-----------------|-----------------|------------------|
| **$4.99** | 0.9M tokens | $5.54 | ~11 prompts | ~2 prompts | ~8-9 prompts |
| **$9.99** | 1.8M tokens | $5.55 | ~22 prompts | ~4 prompts | ~16-17 prompts |
| **$19.99** | 3.6M tokens | $5.55 | ~45 prompts | ~8 prompts | ~33-34 prompts |
| **$39.99** | 7.2M tokens | $5.55 | ~90 prompts | ~16 prompts | ~66-67 prompts |

#### Option B: Rounded Top-Ups (User-Friendly)
More user-friendly numbers with slight premium:

| Price | Tokens | Price per 1M | Prompts (small) | Prompts (large) | Prompts (mixed) |
|-------|--------|--------------|-----------------|-----------------|------------------|
| **$4.99** | 1.0M tokens | $4.99 | ~12 prompts | ~2 prompts | ~9-10 prompts |
| **$9.99** | 2.0M tokens | $5.00 | ~25 prompts | ~4 prompts | ~18-19 prompts |
| **$19.99** | 4.0M tokens | $5.00 | ~50 prompts | ~9 prompts | ~37-38 prompts |
| **$39.99** | 8.0M tokens | $5.00 | ~100 prompts | ~18 prompts | ~74-75 prompts |

#### Option C: Value Tiers (Higher Premium for Flexibility)
Higher premium for one-time purchases:

| Price | Tokens | Price per 1M | Prompts (small) | Prompts (large) | Prompts (mixed) |
|-------|--------|--------------|-----------------|-----------------|------------------|
| **$4.99** | 0.8M tokens | $6.24 | ~10 prompts | ~2 prompts | ~7-8 prompts |
| **$9.99** | 1.6M tokens | $6.24 | ~20 prompts | ~3 prompts | ~15 prompts |
| **$19.99** | 3.2M tokens | $6.24 | ~40 prompts | ~7 prompts | ~29-30 prompts |
| **$49.99** | 8.0M tokens | $6.24 | ~100 prompts | ~18 prompts | ~74-75 prompts |

### Top-Up Recommendations

**Recommended: Option B (Rounded Top-Ups)**
- **Rationale:** 
  - Matches subscription value at $19.99 tier (same as monthly subscription)
  - User-friendly round numbers (1M, 2M, 4M, 8M tokens)
  - Slight premium only on smaller tiers
  - Encourages larger purchases

**Top-Up Product Structure:**
1. **Starter Pack - $4.99:** 1.0M tokens (~9-10 mixed prompts)
2. **Standard Pack - $9.99:** 2.0M tokens (~18-19 mixed prompts)
3. **Pro Pack - $19.99:** 4.0M tokens (~37-38 mixed prompts) - *Same as monthly subscription*
4. **Mega Pack - $39.99:** 8.0M tokens (~74-75 mixed prompts) - *Best value*

### Top-Up vs Subscription Comparison

| Feature | Subscription | Top-Up |
|---------|-------------|--------|
| **Monthly Plan** | $20/month = 4.0M tokens | $19.99 = 4.0M tokens (one-time) |
| **Value** | $5.00 per 1M tokens | $5.00 per 1M tokens (at $19.99 tier) |
| **Renewal** | Automatic monthly | One-time purchase |
| **Best For** | Regular users | Occasional users, testing |
| **Incentive** | Consistent access | Flexibility |

**Note:** Top-ups don't expire, but subscriptions reset monthly. This makes subscriptions better for regular users.

## Implementation Notes

1. **Token Tracking:** Need to track input, output, and context caching tokens separately
2. **Prompt Size Detection:** Determine if prompt is ≤200k or >200k tokens to apply correct pricing
3. **Storage Billing:** Track storage hours separately or include in token allocation
4. **Reset Logic:** Implement monthly token reset on billing cycle
5. **Overage Handling:** Decide if users can purchase additional tokens or must wait for reset

