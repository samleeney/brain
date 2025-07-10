# REACH Antenna Design

## Hexagonal Dipole Array

The REACH telescope employs a unique hexagonal array of bow-tie dipole antennas optimised for 50-200 MHz observations of the 21-cm signal from cosmic dawn.

## Design Philosophy

### Ultra-Wideband Performance
- **Frequency range**: 50-200 MHz (4:1 bandwidth)
- **Redshift coverage**: z = 6-27
- **Key epoch**: Cosmic dawn and first stars

### Chromatic Response
The frequency-dependent beam pattern is a feature, not a bug:
- Enables foreground-signal separation
- Well-characterised chromatic distortions
- Bayesian analysis exploits beam chromaticity

## Antenna Elements

### Bow-tie Dipoles
- **Design**: Planar bow-tie geometry
- **Impedance**: 200Ω balanced
- **Material**: Aluminium on fibreglass substrate
- **Dimensions**: 1.5m tip-to-tip

### Hexagonal Configuration
- **19 elements**: Hexagonal close-packed array
- **Spacing**: 1.5m between centres
- **Total diameter**: ~6m
- **Ground plane**: Welded wire mesh, 10m × 10m

## Feed Network

### Balun Design
- **Type**: Infinite balun (coaxial choke)
- **Transformation**: 200Ω balanced → 50Ω unbalanced
- **Bandwidth**: Full 50-200 MHz range
- **Insertion loss**: < 0.5 dB

### Signal Combination
- **Architecture**: Analogue beamforming
- **Combiners**: Wilkinson power dividers
- **Phase matching**: Critical for beam stability
- **Output**: Single combined signal to receiver

## Environmental Considerations

### RFI Mitigation
- **Location**: Karoo Radio Reserve, South Africa
- **Shielding**: Natural terrain blocking
- **Ground screen**: Reduces ground-wave RFI
- **Orientation**: Optimised for quiet directions

### Thermal Management
- **Diurnal variation**: ±30°C typical
- **Material selection**: Low thermal expansion
- **Connector torque**: Temperature-compensated
- **Monitoring**: Continuous temperature logging

## Calibration Features

### Embedded Calibrators
- **Noise source**: Switchable for Tsys measurement
- **Cable reflections**: Time-domain gating
- **Beam mapping**: Drone-based measurements
- **Cross-coupling**: S-parameter characterisation

## Performance Metrics

### Sensitivity
- **System temperature**: 180K at 100 MHz
- **Effective area**: 50 m² at 100 MHz
- **Integration time**: 1000+ hours typical
- **21-cm sensitivity**: 100-200 mK RMS

### Beam Characteristics
- **FWHM**: 90° at 50 MHz → 25° at 200 MHz
- **Sidelobe level**: -15 dB typical
- **Polarisation**: Dual linear (X/Y)
- **Cross-pol isolation**: > 20 dB