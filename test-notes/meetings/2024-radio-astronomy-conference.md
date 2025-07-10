# Radio Astronomy Conference 2024 - Meeting Notes

**Date**: March 15-17, 2024
**Location**: Cape Town, South Africa
**Attendees**: SKA consortium members, MeerKAT team, international collaborators

## Day 1: Antenna Design Sessions

### Morning Session - Feed Horn Optimization
**Presenter**: Dr. Sarah Chen, SKA-SA

Key points discussed:
- Optimal edge taper for L-band feeds: **-12 dB** consensus
- Trade-off analysis: spillover temperature vs aperture efficiency
- New corrugated horn design achieving 0.75 aperture efficiency

**Action Items**:
- [ ] Test prototype feed with MeerKAT spare dish
- [ ] Compare with CSIRO Mk II feed performance
- [ ] Document thermal expansion coefficients

### Afternoon Session - Cryogenic Systems
**Panel Discussion**: Cooling strategies for next-gen receivers

Critical temperatures achieved:
- First stage: 77K (liquid nitrogen)
- Second stage: 20K (closed-cycle)
- LNA operating temp: 15K

**Note**: New InP HEMT LNAs showing 3.5K noise temperature at L-band

## Day 2: Signal Processing Workshop

### VLBI Correlation Updates
**Lead**: Prof. James Wilson, JIVE

New developments:
- Software correlator achieving 32 Gbps/station
- Real-time fringe detection implemented
- Phase referencing improvements: 15 microarcsec precision

### RFI Mitigation Strategies
**Working Group Report**:

Successful techniques:
1. **Spectral Kurtosis**: 95% flagging accuracy
2. **Cyclostationary detection**: Catches periodic RFI
3. **ML approaches**: CNN showing promise for satellite RFI

**Important**: 5G rollout creating new challenges at 3.5 GHz

## Day 3: Future Instrumentation

### Phased Array Feeds Discussion
**MeerKAT+ Upgrade Plans**:

- 40-beam L-band PAF design approved
- Tsys/η target: 35K
- Instantaneous FOV: 2.5 deg²
- Timeline: First light 2026

### Mid-Frequency Aperture Array
**SKA-Mid Updates**:

Design decisions:
- Element spacing: 1.5m (scaled from AAVS2)
- Digital beamforming architecture
- Power consumption: 100W/m²

## Key Takeaways

1. **Standardization**: Need common interface definitions for SKA feeds
2. **Calibration**: New holography techniques reducing surface errors to λ/50
3. **Computing**: Correlator upgrades essential for increased bandwidth
4. **Collaboration**: Joint observation proposals encouraged

## Follow-up Actions

- Share feed horn CAD files via consortium portal
- Schedule quarterly technical reviews
- Prepare white paper on RFI mitigation best practices
- Coordinate with optical design team on sub-reflector modifications

## References
- MeerKAT technical memo series: [MKAT-TM-2024-001]
- SKA feed design document: [SKA-TEL-DSH-0000001]
- VLBI correlation handbook v3.2