# REACH Bayesian Analysis Pipeline

## Overview

The REACH pipeline uses Bayesian inference to extract the faint 21-cm signal from dominant foregrounds, leveraging the instrument's chromatic response.

## Forward Modelling Approach

### Signal Model
The measured sky temperature:
```
T_sky(ν) = T_fg(ν) + T_21(ν) + T_noise(ν)
```

Where:
- **T_fg**: Foreground emission (100-1000 K)
- **T_21**: Global 21-cm signal (0.1-0.2 K)
- **T_noise**: Thermal noise

### Instrument Model
```
T_ant(ν) = ∫ B(ν,Ω) × T_sky(ν,Ω) dΩ + T_sys(ν)
```

Including:
- **B(ν,Ω)**: Chromatic beam pattern
- **T_sys**: System temperature
- **Reflection coefficients**: Standing waves

## Foreground Modelling

### Physically Motivated Basis
Log-polynomial expansion:
```
T_fg(ν) = Σ_n a_n × [log(ν/ν_0)]^n
```

- **Number of terms**: 5-7 typical
- **Pivot frequency**: ν_0 = 100 MHz
- **Smoothness constraint**: Physical spectra

### Spatial Structure
- **Monopole**: Sky-averaged component
- **Dipole**: East-West gradient
- **Higher modes**: Marginalised

## 21-cm Signal Models

### Parametric Models
Turning point parameterisation:
- **ν_min**: Absorption trough frequency
- **T_min**: Absorption amplitude
- **ν_max**: Emission peak frequency
- **T_max**: Emission amplitude
- **Width parameters**: Transition sharpness

### Physical Models
Astrophysical parameters:
- **f_***: Star formation efficiency
- **ζ_X**: X-ray efficiency
- **ζ_α**: Lyman-α efficiency
- **τ_e**: Electron scattering optical depth

## Bayesian Framework

### Likelihood Function
```
L = exp(-χ²/2) × |2πC|^(-1/2)
```

Where:
- **χ²**: Standard chi-squared
- **C**: Covariance matrix including systematics

### Prior Distributions
- **Foregrounds**: Uniform on coefficients
- **21-cm amplitude**: Log-uniform [-500, 500] mK
- **Frequencies**: Uniform on plausible ranges
- **Systematics**: Informed by lab measurements

### Nested Sampling
Using PolyChord:
- **Live points**: 500-1000
- **Dimensionality**: 20-30 parameters
- **Evidence calculation**: Model comparison
- **Runtime**: 24-48 hours typical

## Systematic Effects

### Beam Chromaticity
- **Forward model**: Full EM simulations
- **Uncertainty**: 10% beam model errors
- **Validation**: Drone measurements
- **Impact**: Couples spatial/spectral structure

### Ionosphere
- **Model**: Time-variable phase screen
- **Parameterisation**: Zernike polynomials
- **Mitigation**: Short baselines insensitive
- **Residuals**: Marginalised in analysis

### Cable Reflections
- **Model**: Sinusoidal modulations
- **Period**: c/(2L) where L = cable length
- **Amplitude**: -40 dB typical
- **Treatment**: Explicit model component

## Pipeline Stages

### Stage 1: Data Preparation
1. **RFI flagging**: MAD algorithm
2. **Calibration**: Noise source switching
3. **Integration**: 1-hour blocks
4. **Quality cuts**: Weather, RFI metrics

### Stage 2: Covariance Estimation
1. **Thermal noise**: Radiometer equation
2. **Systematic errors**: From simulations
3. **Sample variance**: Jack-knife estimation
4. **Full covariance**: Block diagonal approximation

### Stage 3: Parameter Estimation
1. **Initial run**: Wide priors
2. **Prior refinement**: Based on evidence
3. **Production run**: Final constraints
4. **Validation**: Injection/recovery tests

### Stage 4: Model Comparison
1. **Bayes factors**: Between models
2. **Parameter constraints**: Marginalised posteriors
3. **Residual analysis**: Systematic checks
4. **Cross-validation**: Leave-one-out

## Validation Tests

### Simulated Data
- **Mock observations**: Full pipeline
- **Injection tests**: Known signals
- **Recovery fraction**: 95% typical
- **Bias assessment**: < 10 mK

### Null Tests
- **Time reversal**: Symmetry test
- **Even/odd**: Independent subsets
- **Frequency subsets**: Consistency
- **Spatial nulls**: Beam rotations

## Results Products

### Primary Outputs
1. **21-cm constraints**: Amplitude and shape
2. **Parameter posteriors**: Full distributions
3. **Model evidence**: Relative probabilities
4. **Residual spectra**: Systematic assessment

### Derived Products
- **Astrophysical parameters**: From signal fits
- **Foreground maps**: Spatial structure
- **Systematic models**: Beam, gains, etc.
- **Covariance matrices**: For external use