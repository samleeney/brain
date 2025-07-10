# REACH Observations

## Observing Strategy

### Site Location
**Karoo Radio Reserve, South Africa**
- **Coordinates**: 30.7°S, 21.4°E
- **Elevation**: 1000m ASL
- **RFI environment**: Radio quiet zone
- **Access**: Restricted, SKA-managed

### Observing Modes

#### Drift Scan Mode
Primary observing strategy:
- **Fixed pointing**: Zenith
- **Sky coverage**: -30° declination strip
- **Integration**: 24/7 operation
- **Calibration**: Every 30 minutes

#### Tracked Observations
For systematics checks:
- **Galactic poles**: Low foreground
- **Fornax A**: Bright calibrator
- **Cold sky**: Avoidance regions
- **Duration**: 2-4 hours typical

## Data Collection

### Time Sampling
- **Raw rate**: 1 Hz
- **Integration**: 60s for science
- **Calibration**: 10s for noise source
- **File size**: ~1 GB/day

### Frequency Coverage
- **Band**: 50-200 MHz continuous
- **Channels**: 1024 (146 kHz resolution)
- **Bandwidth**: 150 MHz instantaneous
- **RFI notches**: FM band excluded

### Data Products
1. **Level 0**: Raw voltages (rarely saved)
2. **Level 1**: Calibrated spectra
3. **Level 2**: RFI-flagged, averaged
4. **Level 3**: Science-ready products

## Calibration Procedures

### System Temperature
**Y-factor method**:
1. Observe sky (T_sky + T_sys)
2. Switch to noise source (T_sky + T_sys + T_cal)
3. Calculate: T_sys = T_cal/(Y-1)
4. Repeat every 30 minutes

### Bandpass Calibration
**Requirements**:
- Stability: < 0.1% over 1 hour
- Accuracy: < 1% absolute
- Ripple: < -40 dB

**Method**:
- Short-term: Noise source ratios
- Long-term: Astronomical sources
- Validation: Laboratory measurements

### Beam Mapping
**Drone-based system**:
- **Transmitter**: Calibrated noise source
- **Flight pattern**: Raster scan
- **Height**: 100-300m AGL
- **Frequency points**: 10 across band
- **Accuracy**: 5% in main beam

## Environmental Monitoring

### Weather Station
Critical parameters:
- **Temperature**: ±0.1°C accuracy
- **Humidity**: Affects ground constants
- **Wind**: Mechanical stress
- **Rain**: Operations suspended

### RFI Monitoring
- **Spectrum analyser**: Independent system
- **Antennas**: Omni-directional
- **Coverage**: 10 MHz - 1 GHz
- **Logging**: Continuous

### Ground Conditions
- **Soil moisture**: Affects reflections
- **Temperature profile**: 5 depth sensors
- **Conductivity**: Seasonal variations
- **Maintenance**: Vegetation control

## Operations

### Automated Systems
- **Data collection**: Fully autonomous
- **Quick-look pipeline**: Real-time monitoring
- **Alert system**: Hardware/RFI issues
- **Remote access**: VPN connection

### Maintenance Schedule
**Daily**:
- System health checks
- Data verification
- RFI report

**Weekly**:
- Connector inspection
- Ground screen check
- Calibration verification

**Monthly**:
- Full system calibration
- Drone beam mapping
- Preventive maintenance

## Data Management

### Storage Architecture
- **On-site**: 50 TB RAID array
- **Transfer**: Fiber to Cape Town
- **Archive**: Cambridge HPC
- **Backup**: Tape system

### Processing Pipeline
1. **Real-time**: RFI flagging
2. **Daily**: Calibration pipeline
3. **Weekly**: Science pipeline
4. **Monthly**: Full reprocessing

### Quality Assurance
**Metrics tracked**:
- RFI occupancy
- System temperature
- Calibration stability
- Data completeness

**Thresholds**:
- < 5% RFI contamination
- < 10 K Tsys variation
- > 95% uptime
- < 1% data loss

## Science Observations

### Phase 1 (Commissioning)
- **Duration**: 6 months
- **Goals**: System characterisation
- **Data**: Public after validation
- **Key tests**: Null observations

### Phase 2 (Science)
- **Duration**: 2+ years
- **Target**: 2000 hours on-sky
- **Strategy**: Continuous drift scan
- **Deliverables**: 21-cm constraints

### Coordinated Observations
**With other experiments**:
- **SARAS-3**: Cross-validation
- **LEDA**: Complementary band
- **EDGES**: Different approach
- **Purpose**: Systematic checks