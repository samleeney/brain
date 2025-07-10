# REACH Collaboration Meeting 2024

**Date**: June 10-12, 2024
**Location**: Kavli Institute for Cosmology, Cambridge
**Attendees**: REACH team, international collaborators

## Day 1: Hardware Status and Updates

### Morning Session - Antenna Array Performance
**Presenter**: Dr. Dave Smith, Cambridge

Key updates on hexagonal array:
- **Chromatic response**: Fully characterised 50-200 MHz
- **Mutual coupling**: -25 dB between elements, as designed
- **Ground plane performance**: 10×10m mesh working well
- Standing wave ratio: < 2:1 across band

**Action Items**:
- [ ] Complete drone-based beam mapping campaign
- [ ] Install temperature sensors on all baluns
- [ ] Document seasonal ground constant variations

### Afternoon Session - Receiver Chain
**Technical Review**: Latest measurements

System performance achieved:
- **Noise temperature**: 180K at 100 MHz (goal: < 200K)
- **Gain stability**: 0.05% over 24 hours
- **Phase stability**: < 1° drift per hour
- **Dynamic range**: 80 dB instantaneous

**Critical finding**: Cable reflection at -42 dB manageable with proper modelling

## Day 2: Data Analysis Workshop

### Bayesian Pipeline Updates
**Lead**: Dr. Dave Smith, Cambridge

New developments in analysis:
- Removed hierarchical sampling (too computationally expensive)
- Physically motivated foreground models: 5-7 log-poly terms optimal
- Nested sampling with PolyChord: 30-parameter space
- Evidence calculation for model comparison

**Foreground wedge strategy**:
1. Exploit chromatic beam response
2. Separate smooth foregrounds from structured 21-cm
3. Forward model all systematic effects
4. Marginalise over uncertainties

### Signal Extraction Results
**Simulations**: Dr. Dave Smith

Recovery tests show:
- **21-cm amplitude**: 10 mK uncertainty after 1000 hours
- **Frequency resolution**: Turning points at z~17 and z~6 detectable
- **Systematic bias**: < 5 mK with current pipeline
- **Foreground residuals**: -60 dB below original

**Important**: Beam chromaticity is our friend, not enemy!

## Day 3: Science Strategy

### Observing Plan
**Operations Lead**: Dr. Dave Smith

Consensus reached:
- **Primary mode**: 24/7 drift scan at zenith
- **Calibration**: Noise source every 30 minutes
- **Integration goal**: 2000+ hours over 2 years
- **Data rate**: 1 GB/day after compression

### Coordination with Other Experiments
**Discussion**: Complementary approaches

REACH advantages:
- **Ultra-wideband**: Single antenna covers full band
- **Well-understood systematics**: Simple design
- **Chromatic exploitation**: Unique to REACH
- **Southern hemisphere**: Different sky than EDGES

Collaboration opportunities:
- Cross-validation with SARAS-3
- Joint constraints with interferometers
- Shared systematic studies

### Theory Connections
**Prof. Dave Smith**: Interpreting future detections

Key physics to constrain:
- **Star formation efficiency**: f_* ~ 1-10%
- **X-ray heating**: L_X/SFR uncertainty
- **Lyman-α background**: Stellar vs exotic sources
- **Dark matter interactions**: Cooling mechanisms

## Key Decisions and Next Steps

### Technical Decisions
1. **Finalize cable lengths**: Minimise reflections
2. **RFI strategy**: Automated flagging + manual review
3. **Beam mapping**: Monthly drone flights
4. **Ground screen**: Extend to 12×12m

### Analysis Decisions
1. **Foreground model**: Max 7 log-poly terms
2. **21-cm parameterisation**: Turning points + amplitudes
3. **Systematics**: Full forward modelling approach
4. **Validation**: Injection tests mandatory

### Timeline
- **Q3 2024**: Complete commissioning
- **Q4 2024**: Start science observations
- **Q2 2025**: First science results
- **2026**: Full 2000-hour dataset

## Technical Specifications Discussed

### Hexagonal Array Details
- Element spacing: 1.5m (0.5λ at 100 MHz)
- Total collecting area: ~30 m²
- Beam FWHM: 90° → 25° (50 → 200 MHz)
- Polarisation: Dual linear, analysed separately

### Sensitivity Projections
After 1000 hours:
- **Global signal**: 100-200 mK detection threshold
- **Spectral resolution**: 1 MHz for science
- **Temporal stability**: 1 mK over days
- **Foreground suppression**: 10^5 required

## References and Resources
- REACH technical memos: [REACH-TM-001 through 050]
- Bayesian pipeline paper: Smith et al. 2024 (in prep)
- Hardware paper: Smith et al. 2024
- Beam measurements: Available on collaboration wiki