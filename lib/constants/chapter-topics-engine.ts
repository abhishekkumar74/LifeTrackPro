/**
 * LifeTrack Pro — Master Chapter Important Topics Engine
 * 
 * Provides granular, high-yield examination topics for every chapter across all 28 target exams:
 * - Railways & Police (RPF SI, RPF Constable, RRB ALP, Technician, JE, NTPC, etc.)
 * - SSC (CGL, CHSL, MTS, CPO)
 * - UPSC & State PCS (History, Geography, Polity, Economy, Science, CSAT)
 * - NEET UG & JEE (Physics, Chemistry, Biology, Mathematics)
 * - Banking & Insurance (IBPS, SBI PO & Clerk)
 * - Defence (CDS, NDA, AFCAT)
 * - Boards (Class 10th & Class 12th)
 * - Management & Law (CAT, CUET, CLAT, CA Foundation)
 */

export interface ChapterTopicMap {
  [chapterKey: string]: string[];
}

// -------------------------------------------------------------
// 1. MATHEMATICS & QUANTITATIVE APTITUDE
// -------------------------------------------------------------
const MATH_CHAPTER_TOPICS: ChapterTopicMap = {
  'number system': [
    'Divisibility Rules & Remainder Theorem',
    'Unit Digit & Number of Zeroes Calculation',
    'Prime Numbers, Factors & Multiples',
    'Surds, Indices & Power Comparisons',
    'Fractions, Decimals & Recurring Decimals',
    'BODMAS Simplification & VBODMAS Rules',
  ],
  'lcm and hcf': [
    'HCF & LCM of Integers, Fractions & Decimals',
    'Relation: Product of Numbers = HCF × LCM',
    'Common Remainder Problems in HCF & LCM',
    'Bell Ringing, Circular Track & Clock Crossing Models',
  ],
  'percentages': [
    'Fraction to Percentage Equivalents & Base Changes',
    'Successive Percentage Change (AB Rule)',
    'Income, Expenditure & Savings Balance Problems',
    'Population Growth & Machine Depreciation',
    'Venn Diagram & Voting / Election Problems',
  ],
  'profit and loss': [
    'Cost Price, Selling Price & Marked Price Relations',
    'Profit & Loss Percentage on Cost vs Selling Price',
    'Successive Discounts & Single Equivalent Discount',
    'Dishonest Shopkeeper & Faulty Weights Calculations',
    'Equal Selling Price with Gain/Loss Cases',
    'Partnership & Profit Sharing Ratios',
  ],
  'ratio and proportion': [
    'Ratio Simplification & Compounding',
    'Third, Fourth & Mean Proportional',
    'Coin & Currency Denomination Problems',
    'Income, Expenditure & Savings Ratios',
    'Age Problems based on Ratio Shifting',
  ],
  'mixtures and alligations': [
    'Rule of Alligation & Weighted Average',
    'Two & Three Vessel Liquid Replacement',
    'Repeated Dilution Formula [x(1 - y/x)^n]',
    'Price & Quantity Mixing in Commercial Goods',
  ],
  'simple and compound interest': [
    'Simple Interest Formulas & Rate Fluctuations',
    'Compound Interest (Annual, Half-Yearly & Quarterly Compounding)',
    'Difference between CI and SI for 2 & 3 Years',
    'Equal Annual Installments & Loan Amortization in CI & SI',
    'Sum Doubling & Multi-Year Growth Formulas',
  ],
  'time and work': [
    'Individual & Group Work Efficiency Concept',
    'Alternate Days & Staggered Work Problems',
    'Men, Women & Children Equivalence (M1D1H1/W1 = M2D2H2/W2)',
    'Wages Distribution proportional to Work Done',
    'Work Left Before Completion & Joined Midway Cases',
  ],
  'pipes and cisterns': [
    'Inlet & Outlet Pipe Filling Rates',
    'Leakage Emptying Rates & Capacity Calculation',
    'Alternate Opening of Pipes & Overflow Prevention',
  ],
  'time speed and distance': [
    'Average Speed (Harmonic Mean Formula)',
    'Relative Speed in Same & Opposite Directions',
    'Late & Early Arrival Proportionality',
    'Stoppage Time Calculation & Average Delay',
    'Circular & Linear Races (Head Start & Dead Heat)',
  ],
  'trains': [
    'Train Crossing Stationary Objects (Pole, Person, Tree)',
    'Train Crossing Platforms, Bridges & Tunnels',
    'Two Trains Running in Same & Opposite Directions',
    'Meeting Point Calculation from Staggered Departures',
  ],
  'boats and streams': [
    'Upstream & Downstream Speed Formulation',
    'Speed of Boat in Still Water & Stream Speed',
    'Round Trip Time & Distance Equations',
  ],
  'averages': [
    'Arithmetic Mean & Weighted Average Calculation',
    'Inclusion & Exclusion of Person/Element (Deviation Method)',
    'Batting & Bowling Averages in Cricket Problems',
    'Ages Problems & Average Replacement',
  ],
  'mensuration 2d': [
    'Equilateral, Isosceles & Scalene Triangles (Heron\'s Formula)',
    'Squares, Rectangles, Parallelograms & Rhombus',
    'Trapezium, Regular Hexagon & Polygons Area',
    'Circles, Semicircles, Sectors & Shaded Regions',
    'Path Around Inside & Outside of Rectangular Lawns',
  ],
  'mensuration 3d': [
    'Cubes, Cuboids & Diagonal Length',
    'Right Circular Cylinder & Hollow Pipes (CSA, TSA & Volume)',
    'Cone & Frustum of a Cone (Slant Height & Capacity)',
    'Sphere, Hemisphere & Hollow Shells',
    'Melting, Recasting & Volume Invariance Problems',
  ],
  'algebra': [
    'Basic Algebraic Identities (Square & Cube Expansion)',
    'Factorization & Remainder Theorem of Polynomials',
    'Linear Equations in One & Two Variables',
    'Quadratic Equations (Roots, Discriminant & Vertex)',
    'Symmetric Algebraic Expressions & Substitution Tricks',
  ],
  'geometry': [
    'Lines, Angles, Transversals & Parallel Line Theorems',
    'Triangles: Centroid, Incenter, Circumcenter & Orthocenter',
    'Congruence & Similarity Criteria (BPT / Thales Theorem)',
    'Circles: Chords, Tangents, Secants & Cyclic Quadrilaterals',
    'Coordinate Geometry: Distance, Section & Area Formulas',
  ],
  'trigonometry': [
    'Trigonometric Ratios & Standard Angle Values',
    'Complementary Angle Relations & Identities',
    'Heights & Distances (Elevation & Depression Word Problems)',
    'Maximum & Minimum Values of Trigonometric Functions',
  ],
  'statistics and probability': [
    'Mean, Median, Mode & Empirical Relationship',
    'Range, Mean Deviation & Standard Deviation Basics',
    'Classical Probability, Dice, Coins & Playing Cards',
    'Conditional Probability & Independent Events Basics',
  ],
  'data interpretation': [
    'Tabular DI (Missing Values & Percentage Comparisons)',
    'Bar Graphs & Stacked Bar Charts',
    'Pie Charts (Angle to Percentage Conversion)',
    'Line Graphs & Growth Rate Tracking',
    'Caselet & Paragraph DI Sets',
  ],
};

// -------------------------------------------------------------
// 2. REASONING & GENERAL INTELLIGENCE
// -------------------------------------------------------------
const REASONING_CHAPTER_TOPICS: ChapterTopicMap = {
  'analogies': [
    'Semantic & Word Relationships',
    'Number & Mathematical Operation Analogies',
    'Letter & Alphabet Pattern Analogies',
  ],
  'classification': [
    'Word Odd One Out',
    'Numerical Pattern Odd One Out',
    'Letter Group & Consonant/Vowel Odd One Out',
  ],
  'series': [
    'Arithmetic & Geometric Number Series',
    'Dual & Alternating Number Series',
    'Continuous Alphabet Pattern & Repeating Groups',
    'Alphanumeric Symbol Sequences',
  ],
  'coding decoding': [
    'Letter Shifting & Reverse Alphabet Placement',
    'Number & Symbol Value Substitution',
    'Coded Sentences (Chinese Coding / Deciphering)',
    'Matrix Coding & Operation Based Encryption',
  ],
  'blood relations': [
    'Dialogue & Indicative Relations ("Pointing to a photograph")',
    'Coded Blood Relations (A + B means A is father of B)',
    'Multi-generational Family Tree Mapping',
  ],
  'direction sense': [
    'Cardinal Directions & Degree Rotations (Clockwise/Anticlockwise)',
    'Shortest Distance Calculation (Pythagoras Theorem)',
    'Shadow Direction at Sunrise & Sunset Problems',
    'Relative Final Direction vs Starting Direction',
  ],
  'order and ranking': [
    'Total Persons in a Row Formula [T = L + R - 1]',
    'Interchange of Positions in a Line',
    'Minimum & Maximum People in Overlapping Rows',
    'Ascending/Descending Comparison & Hierarchy',
  ],
  'syllogisms': [
    'Standard Statements (All, Some, No, Some-Not)',
    'Possibility Cases & "Can Be" Conclusions',
    'Either-Or Complementary Pairs Rules',
    'Venn Diagram Modeling of Syllogisms',
  ],
  'venn diagrams': [
    'Three-Set Venn Diagram Overlap Deductions',
    'Geometric Figures Intersection (Triangle, Circle, Rectangle)',
    'Logical Group Classification',
  ],
  'seating arrangements': [
    'Linear Seating (Single Row: North/South Facing)',
    'Parallel Rows (Opposite Facing Persons)',
    'Circular Arrangement (All Facing Center)',
    'Circular Arrangement (Facing Inward & Outward Mixed)',
    'Square & Rectangular Table Arrangements',
  ],
  'puzzles': [
    'Floor & Flat Stacking Puzzles',
    'Day, Month & Year Scheduling Sets',
    'Box Stacking & Color/Variable Association Puzzles',
    'Tabulation Matrix with 3+ Attributes',
  ],
  'statement and assumptions': [
    'Identifying Implicit vs Explicit Assumptions',
    'Evaluating Author\'s Mindset & Preconditions',
    'Validity of Announcements, Notices & Advertisements',
  ],
  'statement and arguments': [
    'Evaluating Strong vs Weak Arguments',
    'Factual Backing vs Emotional Bias in Arguments',
    'National Policy & Constitutional Alignment',
  ],
  'statement and conclusions': [
    'Direct Logical Deductions from Given Premise',
    'Avoiding Out-of-Scope Information in Conclusions',
    'Probable vs Definite Conclusions',
  ],
  'critical reasoning': [
    'Strengthening & Weakening the Argument',
    'Finding Flaws in Reasoning',
    'Course of Action & Problem-Solution Feasibility',
    'Cause and Effect Relationship Determination',
  ],
  'non verbal reasoning': [
    'Mirror Images & Water Reflections',
    'Paper Folding & Punching Patterns',
    'Cube & Dice (Opposite Faces & Unfolded Net Identification)',
    'Embedded Hidden Figures & Figure Completion',
    'Figure Counting (Triangles, Squares & Rectangles)',
  ],
};

// -------------------------------------------------------------
// 3. GENERAL AWARENESS & GENERAL STUDIES
// -------------------------------------------------------------
const GA_CHAPTER_TOPICS: ChapterTopicMap = {
  'history ancient': [
    'Indus Valley Civilization: Major Sites, Town Planning & Seals',
    'Vedic Age: Early vs Later Vedic Society, Rituals & Literature',
    'Buddhism & Jainism: Tirthankaras, Councils, Philosophy & Sects',
    'Mahajanapadas & Rise of Magadha (Haryanka, Shishunaga, Nanda)',
    'Mauryan Empire: Chandragupta, Chanakya, Ashokan Edicts & Dhamma',
    'Post-Mauryan & Sangam Age: Satavahanas, Kushans, Cheras, Cholas, Pandyas',
    'Gupta Golden Age: Administration, Literature, Science & Art',
    'Harshavardhana & Regional Dynasties (Chalukyas, Pallavas)',
  ],
  'history medieval': [
    'Tripartite Struggle (Pratiharas, Palas, Rashtrakutas)',
    'Delhi Sultanate: Slave, Khilji, Tughlaq, Sayyid & Lodi Dynasties',
    'Alauddin Khilji Market Reforms & Muhammad bin Tughlaq Experiments',
    'Bhakti & Sufi Movements: Saints, Philosophy & Cultural Impact',
    'Vijayanagara & Bahmani Empires: Administration & Architecture',
    'Mughal Dynasty: Babur, Akbar (Mansabdari, Sulh-i-Kul) to Aurangzeb',
    'Maratha Empire & Shivaji Maharaj Administration (Ashta Pradhan)',
  ],
  'history modern': [
    'Advent of Europeans & Carnatic Wars / Battle of Plassey & Buxar',
    'British Land Revenue Systems: Permanent, Ryotwari & Mahalwari',
    'Tribal, Peasant & Civil Uprisings Before 1857',
    'Revolt of 1857: Causes, Centers, Leaders & Queen\'s Proclamation',
    'Socio-Religious Reform Movements (Brahmo Samaj, Arya Samaj, Satyashodhak)',
    'Formation of INC & Moderate vs Extremist Era (Surat Split)',
    'Swadeshi Movement, Partition of Bengal & Home Rule League',
    'Gandhian Movements: Champaran, Non-Cooperation, Civil Disobedience',
    'Revolutionary Freedom Fighters: Bhagat Singh, Subhash Chandra Bose & INA',
    'Cripps Mission, Quit India Movement & Cabinet Mission Plan',
    'Indian Independence Act 1947 & Integration of Princely States',
  ],
  'polity constitution': [
    'Historical Background: Regulating Acts to GoI Act 1935',
    'Constituent Assembly, Framing & Preamble Philosophy',
    'Salient Features, Schedules & Sources of Indian Constitution',
    'Union & its Territory (Articles 1-4) & Citizenship (Articles 5-11)',
    'Fundamental Rights (Articles 12-35) & Writs under Article 32 & 226',
    'Directive Principles of State Policy (DPSP) & Fundamental Duties',
    'Union Executive: President, Vice-President, Prime Minister & Cabinet',
    'Union Parliament: Lok Sabha, Rajya Sabha, Parliamentary Committees & Bills',
    'Supreme Court & High Courts: Jurisdiction, Appointments & Collegium',
    'State Executive & Legislature: Governor Powers & Vidhan Sabha/Parishad',
    'Panchayati Raj & Municipalities (73rd & 74th Amendments)',
    'Constitutional & Non-Constitutional Bodies (Election Comm, UPSC, CAG, NITI)',
    'Emergency Provisions (Articles 352, 356, 360) & Key Amendments (42nd, 44th, 86th, 101st)',
  ],
  'geography india': [
    'Physiographic Divisions: Himalayas, Northern Plains, Peninsular Plateau, Coasts',
    'Drainage System: Himalayan Rivers vs Peninsular Rivers & River Basins',
    'Multipurpose River Valley Projects, Dams & Water Disputes',
    'Indian Monsoon Mechanism: El Nino, La Nina & Western Disturbances',
    'Soil Types of India: Alluvial, Black, Red, Laterite & Soil Conservation',
    'Natural Vegetation & Forest Types of India (National Parks & Biospheres)',
    'Indian Agriculture: Major Kharif, Rabi, Zaid Crops & Cropping Patterns',
    'Mineral & Energy Resources: Coal, Petroleum, Natural Gas & Renewable Energy',
    'Transport Networks: Railways, National Highways, Inland Waterways & Ports',
  ],
  'geography world': [
    'Origin of Earth, Lithosphere, Continental Drift & Plate Tectonics',
    'Earthquakes, Volcanoes & Ring of Fire',
    'Atmosphere Composition, Layers, Atmospheric Pressure Belts & Winds',
    'Ocean Currents: Warm & Cold Currents, Tides & Ocean Floor Relief',
    'Major Mountain Ranges, Straits, Canals & Deserts of the World',
  ],
  'economy': [
    'National Income Aggregates: GDP, GNP, NNP & Factor Cost vs Market Price',
    'Inflation: Demand-Pull, Cost-Push, Headline vs Core, CPI vs WPI',
    'RBI Monetary Policy: Repo, Reverse Repo, CRR, SLR, MSF & Open Market Ops',
    'Indian Banking Structure: Commercial Banks, Small Finance, Payment Banks & NPA',
    'Fiscal Policy: Union Budget, Revenue vs Capital Account & Fiscal Deficit',
    'Taxation System: Direct vs Indirect Taxes & GST Structure',
    'Stock Market & Money Market Instruments: Treasury Bills, Commercial Papers, SEBI',
    'Poverty, Unemployment Metrics & Flagship Welfare Schemes',
    'Foreign Trade, Balance of Payments (BoP), FDI & Forex Reserves',
  ],
  'general science': [
    'Motion, Force, Newton\'s Laws, Work, Energy & Gravitation',
    'Heat, Thermodynamics, Reflection, Refraction & Optical Instruments',
    'Electricity, Ohm\'s Law, Magnetism & Electromagnetic Spectrum',
    'Structure of Atom, Periodic Table & Chemical Bonding',
    'Acids, Bases, Salts, pH Scale & Everyday Chemistry',
    'Metals, Non-Metals, Metallurgy & Important Alloys',
    'Cell Structure, Organelles, Plant vs Animal Cells',
    'Human Anatomy: Digestive, Circulatory, Respiratory & Nervous Systems',
    'Human Diseases, Pathogens, Vaccines & Nutrition/Vitamins',
  ],
  'railways general': [
    'History of Indian Railways, First Train (1853) & Historic Milestones',
    'Railway Zones, Headquarters & Dedicated Production Units (ICF, DLW, CLW)',
    'Railway Track Gauges, Electrification & Vande Bharat Infrastructure',
    'Signalling Systems: Automatic Block, Absolute Block & Colour Light Signals',
    'Railway Safety Innovations: KAVACH Anti-Collision System & Interlocking',
    'Dedicated Freight Corridors (WDFC, EDFC) & Freight Operations',
    'Railway Budget Integration & Modern Station Redevelopment (Amrit Bharat)',
  ],
};

// -------------------------------------------------------------
// 4. BASIC SCIENCE & ENGINEERING (RRB ALP / TECHNICIAN / JE)
// -------------------------------------------------------------
const BSE_CHAPTER_TOPICS: ChapterTopicMap = {
  'engineering drawing': [
    'Drawing Instruments, Sheets, Scales & Line Conventions',
    'Geometric Constructions & Lettering Standards',
    'Orthographic Projections: First Angle vs Third Angle',
    'Isometric & Axonometric Views of Geometric Solids',
    'Sectional Views & Dimensioning Protocols',
  ],
  'units and measurements': [
    'Fundamental & Derived SI Units and Conversions',
    'Dimensions of Physical Quantities & Dimensional Analysis',
    'Measuring Instruments: Vernier Caliper, Micrometer Screw Gauge',
    'Errors in Measurement: Systematic, Random & Percentage Errors',
  ],
  'mass weight and density': [
    'Mass vs Weight & Gravitational Acceleration Variations',
    'Density, Relative Density & Specific Gravity',
    'Archimedes Principle & Law of Flotation (Hydrometer)',
  ],
  'work power and energy': [
    'Work Done by Constant & Variable Force (Positive, Negative, Zero)',
    'Kinetic Energy, Potential Energy & Work-Energy Theorem',
    'Power Formulation (Watts, Horsepower) & Practical Units (kWh)',
    'Law of Conservation of Energy & Mechanical Transformations',
  ],
  'speed and velocity': [
    'Distance vs Displacement & Speed vs Velocity Differences',
    'Uniform & Non-Uniform Acceleration and Equations of Motion',
    'Velocity-Time Graphs & Calculation of Displacement / Acceleration',
    'Projectile Motion & Circular Motion Kinematics',
  ],
  'heat and temperature': [
    'Temperature Scales: Celsius, Fahrenheit, Kelvin Conversions',
    'Modes of Heat Transfer: Conduction, Convection & Radiation',
    'Thermal Expansion of Solids, Liquids & Bimetallic Strips',
    'Specific Heat Capacity, Latent Heat & Calorimetry Equations',
  ],
  'basic electricity': [
    'Electric Charge, Coulomb\'s Law & Electric Potential',
    'Ohm\'s Law, Resistance, Resistivity & Temperature Coefficient',
    'Series & Parallel Combination of Resistors & Capacitors',
    'Kirchhoff\'s Laws (Current Law & Voltage Law)',
    'Heating Effect of Current (Joule\'s Law) & Electric Power',
    'Magnetic Effect of Current, Electromagnets & Faraday\'s Induction',
  ],
  'levers and simple machines': [
    'Simple Machines Terminology: Mechanical Advantage, Velocity Ratio, Efficiency',
    'Levers of Class 1, Class 2 and Class 3 with Practical Examples',
    'Pulleys: Single Fixed, Single Movable & Block and Tackle Systems',
    'Wheel and Axle, Inclined Plane & Screw Jack Mechanics',
  ],
  'occupational safety': [
    'Personal Protective Equipment (PPE) & Workshop Safety Codes',
    'Fire Extinguisher Classes (A, B, C, D) & Extinguishing Agents',
    'First Aid for Electric Shock, Burns & Bleeding',
    'Hazard Identification, Electrical Grounding & Cautionary Signs',
  ],
  'environment education': [
    'Ecosystem Balance, Food Chains & Trophic Levels',
    'Air, Water, Soil & Noise Pollution Sources and Mitigation',
    'Global Warming, Greenhouse Gases & Ozone Layer Depletion',
    'Waste Management: 3Rs (Reduce, Reuse, Recycle) & Hazardous Disposal',
  ],
  'it literacy': [
    'Computer Architecture: CPU, ALU, Cache, RAM & ROM',
    'Operating System Basics: Windows, Linux File Systems & Tasks',
    'MS Office Applications: Word Processing, Excel Formulas & Spreadsheets',
    'Computer Networking: LAN, WAN, IP Address, DNS & Web Protocols',
    'Cyber Security: Malware, Phishing, Firewalls & Digital Hygiene',
  ],
};

// -------------------------------------------------------------
// 5. NEET & CLASS 11-12 SCIENCE (PHYSICS, CHEMISTRY, BIOLOGY)
// -------------------------------------------------------------
const MEDICAL_SCIENCE_TOPICS: ChapterTopicMap = {
  // Biology
  'the living world': [
    'What is Living: Growth, Reproduction, Metabolism, Consciousness',
    'Binomial Nomenclature & Taxonomic Hierarchy',
    'Taxonomical Aids: Herbarium, Botanical Gardens, Museums, Keys',
  ],
  'biological classification': [
    'Five Kingdom Classification (Monera, Protista, Fungi, Plantae, Animalia)',
    'Kingdom Monera: Archaebacteria, Eubacteria & Mycoplasma',
    'Kingdom Protista: Chrysophytes, Dinoflagellates, Euglenoids, Protozoans',
    'Kingdom Fungi: Phycomycetes, Ascomycetes, Basidiomycetes, Deuteromycetes',
    'Viruses, Viroids, Prions & Lichens',
  ],
  'plant kingdom': [
    'Algae: Chlorophyceae, Phaeophyceae, Rhodophyceae',
    'Bryophytes: Liverworts, Mosses & Alternation of Generations',
    'Pteridophytes: Vascular Cryptogams, Heterospory & Seed Habit',
    'Gymnosperms: Morphology, Anatomy & Conifers',
    'Angiosperms & Plant Life Cycles (Haplontic, Diplontic, Haplodiplontic)',
  ],
  'animal kingdom': [
    'Basis of Classification: Symmetry, Coelom, Germ Layers, Segmentation',
    'Non-Chordata: Porifera, Coelenterata, Ctenophora, Platyhelminthes',
    'Aschelminthes, Annelida, Arthropoda, Mollusca, Echinodermata, Hemichordata',
    'Chordata: Urochordata, Cephalochordata & Vertebrata',
    'Classes: Cyclostomata, Chondrichthyes, Osteichthyes, Amphibia, Reptilia, Aves, Mammalia',
  ],
  'morphology of flowering plants': [
    'Root Modifications (Tap root, Fibrous, Adventitious)',
    'Stem Modifications (Tendrils, Thorns, Runners, Stolon)',
    'Leaf Venation, Phyllotaxy & Modifications',
    'Inflorescence: Racemose & Cymose',
    'Flower Structure, Aestivation & Placentation',
    'Fruit & Seed Structure and Families (Fabaceae, Solanaceae, Liliaceae)',
  ],
  'anatomy of flowering plants': [
    'Meristematic & Permanent Tissues (Simple & Complex: Xylem, Phloem)',
    'Epidermal, Ground & Vascular Tissue Systems',
    'Anatomy of Dicot & Monocot Roots, Stems & Leaves',
    'Secondary Growth: Vascular Cambium & Cork Cambium Activity',
  ],
  'cell the unit of life': [
    'Cell Theory & Prokaryotic vs Eukaryotic Cell Structure',
    'Cell Membrane (Fluid Mosaic Model) & Transport (Active/Passive)',
    'Endomembrane System: ER, Golgi, Lysosomes, Vacuoles',
    'Mitochondria, Plastids, Ribosomes & Cytoskeleton',
    'Nucleus, Chromatin & Chromosome Types based on Centromere',
  ],
  'cell cycle and cell division': [
    'Phases of Cell Cycle: Interphase (G1, S, G2) & M Phase',
    'Mitosis: Prophase, Metaphase, Anaphase, Telophase & Cytokinesis',
    'Meiosis I & Meiosis II: Crossing Over, Synapsis & Chiasmata Formation',
    'Significance of Mitosis & Meiosis in Genetics',
  ],
  'human physiology': [
    'Digestive Enzymes, Gastric Secretions & Nutrient Absorption',
    'Respiratory Volumes (Tidal, Vital Capacity) & Gas Exchange',
    'Blood Composition, Groups (ABO/Rh) & Cardiac Cycle / ECG',
    'Excretory System: Nephron Structure, Urine Formation & Counter-Current',
    'Muscular Contraction: Sliding Filament Theory & Skeletal System',
    'Nervous System: Action Potential, Synapse & Reflex Arc',
    'Endocrine System: Hormones of Pituitary, Thyroid, Adrenal & Pancreas',
  ],
  'genetics and evolution': [
    'Mendel\'s Laws of Inheritance & Dihybrid Cross Ratios',
    'Incomplete Dominance, Codominance & Multiple Alleles',
    'Sex Determination in Humans, Birds & Honeybees',
    'Genetic Disorders: Down\'s, Turner\'s, Klinefelter\'s, Thalassemia, Sickle Cell',
    'DNA Structure, Replication, Transcription & Genetic Code',
    'Translation, Lac Operon Regulation & DNA Fingerprinting',
    'Darwinian Evolution, Natural Selection & Hardy-Weinberg Principle',
  ],
  'biotechnology': [
    'Restriction Enzymes, Ligases & Cloning Vectors (pBR322)',
    'Polymerase Chain Reaction (PCR) & Gel Electrophoresis',
    'Recombinant DNA Technology & Bioreactor Cultivation',
    'Applications: Bt Cotton, RNA Interference & Recombinant Insulin',
    'Gene Therapy, Transgenic Animals & Ethical Issues (Biopiracy)',
  ],
  'ecology and environment': [
    'Organism and Environment: Abiotic Factors & Adaptations',
    'Population Attributes, Growth Curves (Logistic, Exponential)',
    'Ecosystem Structure, Productivity, Decomposition & Energy Flow',
    'Ecological Pyramids (Number, Biomass, Energy) & Succession',
    'Biodiversity: Latitudinal Gradients, Hotspots & In-situ/Ex-situ Conservation',
  ],

  // Physics
  'kinematics': [
    'Rectilinear Motion, Velocity & Instantaneous Acceleration',
    'Derivation of Kinematic Equations under Uniform Acceleration',
    'Motion Under Gravity & Free Fall Calculations',
    'Projectile Motion: Range, Maximum Height & Time of Flight',
    'Relative Motion in 1D & 2D (Rain-Man & River-Boat Problems)',
  ],
  'laws of motion': [
    'Newton\'s Three Laws & Concept of Inertia and Momentum',
    'Impulse, Conservation of Linear Momentum & Gun Recoil',
    'Static, Kinetic & Rolling Friction and Angle of Repose',
    'Centripetal Force, Centrifugal Force & Banking of Curved Tracks',
    'Free Body Diagrams (FBD) & Multi-block Pulley Systems',
  ],
  'work energy and power': [
    'Dot Product of Vectors & Work Done by Constant/Variable Force',
    'Kinetic Energy, Potential Energy & Work-Energy Theorem',
    'Conservative vs Non-Conservative Forces',
    'Elastic & Inelastic Collisions in One and Two Dimensions',
    'Potential Energy of a Spring & Vertical Circular Motion',
  ],
  'rotational motion': [
    'Center of Mass of Symmetric & Continuous Bodies',
    'Angular Velocity, Angular Acceleration & Torque Formulation',
    'Moment of Inertia of Rings, Discs, Cylinders & Spheres',
    'Parallel & Perpendicular Axes Theorems',
    'Angular Momentum Conservation & Pure Rolling Motion',
  ],
  'gravitation': [
    'Newton\'s Universal Law of Gravitation & Gravitational Constant G',
    'Variation of g with Altitude, Depth & Latitude (Rotation)',
    'Gravitational Potential & Potential Energy',
    'Escape Velocity from Earth Surface & Orbital Velocity of Satellites',
    'Kepler\'s Three Laws of Planetary Motion',
  ],
  'thermodynamics': [
    'Zeroth Law & Concept of Thermal Equilibrium',
    'First Law of Thermodynamics (Q = ΔU + W)',
    'Isothermal, Adiabatic, Isobaric & Isochoric Processes',
    'Second Law of Thermodynamics, Heat Engines & Carnot Cycle Efficiency',
  ],
  'electrostatics': [
    'Coulomb\'s Law in Vector Form & Superposition Principle',
    'Electric Field, Field Lines & Dipole in Uniform Field',
    'Gauss\'s Law & Applications (Sheet, Wire, Spherical Shell)',
    'Electric Potential, Potential Difference & Equipotential Surfaces',
    'Capacitance of Parallel Plate Capacitor, Dielectric Insertion & Energy',
  ],
  'current electricity': [
    'Drift Velocity, Current Density & Ohm\'s Law Derivation',
    'Temperature Dependence of Resistivity & Color Coding',
    'Kirchhoff\'s Rules (KCL, KVL) & Wheatstone Bridge Balance',
    'EMF, Internal Resistance & Combination of Cells (Series/Parallel)',
    'Potentiometer & Meter Bridge Working Principles',
  ],
  'optics': [
    'Reflection: Spherical Mirrors, Mirror Formula & Magnification',
    'Refraction: Snell\'s Law, Total Internal Reflection & Optical Fibers',
    'Refraction through Lenses, Lens Maker\'s Formula & Power of Lens',
    'Refraction through Prism, Dispersion & Rainbow Formation',
    'Optical Instruments: Simple/Compound Microscope & Astronomical Telescope',
    'Wave Optics: Huygens Principle, Young\'s Double Slit Experiment (YDSE)',
    'Diffraction at Single Slit & Resolving Power / Polarization Basics',
  ],
  'modern physics': [
    'Photoelectric Effect, Einstein\'s Equation & Stopping Potential',
    'De Broglie Wavelength of Matter Waves & Dual Nature',
    'Bohr\'s Model of Hydrogen Atom, Spectral Lines (Lyman, Balmer)',
    'Nuclear Composition, Binding Energy Curve & Mass Defect',
    'Radioactive Decay Law, Half Life & Alpha, Beta, Gamma Emission',
    'Semiconductors: Intrinsic, Extrinsic (p-type, n-type), p-n Junction Diode',
    'Rectifiers (Half Wave, Full Wave), Zener Diode & Logic Gates',
  ],

  // Chemistry
  'chemical bonding': [
    'Ionic, Covalent & Coordinate Bonds Formulation',
    'Lewis Structures, Formal Charge & Octet Rule Violations',
    'VSEPR Theory & Molecular Geometry (Linear, Trigonal, Tetrahedral)',
    'Hybridization (sp, sp2, sp3, sp3d) & Bond Angle Analysis',
    'Molecular Orbital Theory (MOT): Bond Order, Paramagnetism of O2/N2',
    'Hydrogen Bonding (Inter vs Intra) & Dipole Moments',
  ],
  'organic chemistry': [
    'IUPAC Nomenclature of Multifunctional Organic Compounds',
    'Structural & Stereoisomerism (Geometrical & Optical Isomers)',
    'Inductive, Electromeric, Resonance & Hyperconjugation Effects',
    'Reaction Intermediates: Carbocations, Carbanions, Free Radicals',
    'Electrophilic Addition, Nucleophilic Substitution (SN1, SN2)',
    'Elimination Reactions (E1, E2, Saytzeff vs Hofmann Rule)',
    'Aromaticity (Huckel\'s Rule) & Electrophilic Aromatic Substitution',
  ],
  'hydrocarbons': [
    'Alkanes: Free Radical Halogenation & Wurtz Reaction',
    'Alkenes: Preparation, Markovnikov & Anti-Markovnikov Addition',
    'Ozonolysis of Alkenes & Identification of Carbonyl Products',
    'Alkynes: Acidity of Terminal Alkynes & Hydration Reactions',
    'Benzene: Nitration, Sulphonation, Friedel-Crafts Alkylation/Acylation',
  ],
  'thermodynamics chemistry': [
    'State Functions, Extensive vs Intensive Properties',
    'First Law, Enthalpy (ΔH) & Heat Capacity (Cp, Cv)',
    'Hess\'s Law of Constant Heat Summation & Bond Enthalpies',
    'Entropy (ΔS), Second Law & Spontaneity Criterion',
    'Gibbs Free Energy (ΔG = ΔH - TΔS) & Equilibrium Constant Relation',
  ],
  'solutions': [
    'Concentration Units: Molarity, Molality, Mole Fraction & PPM',
    'Henry\'s Law of Gas Solubility & Raoult\'s Law for Ideal Solutions',
    'Positive & Negative Deviations from Raoult\'s Law (Azeotropes)',
    'Colligative Properties: Relative Lowering of VP, Elevation in BP',
    'Depression in Freezing Point, Osmotic Pressure & Van\'t Hoff Factor (i)',
  ],
  'electrochemistry': [
    'Galvanic Cells, Cell Representation & Standard Hydrogen Electrode',
    'Nernst Equation & Calculation of Cell EMF under Non-standard Conditions',
    'Conductivity, Molar Conductivity & Kohlrausch\'s Law of Independent Migration',
    'Faraday\'s Laws of Electrolysis & Quantitative Calculations',
    'Batteries (Lead Storage, Dry Cell, Fuel Cells) & Corrosion Prevention',
  ],
};

// -------------------------------------------------------------
// HELPER MATCHING & RETRIEVAL ENGINE
// -------------------------------------------------------------

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dynamically resolves 3 to 6 important, high-yield examination topics
 * for any given chapter, subject, and exam.
 */
export function getImportantTopicsForChapter(
  subjectName: string,
  chapterName: string,
  examSlug?: string
): string[] {
  const normSub = normalizeKey(subjectName);
  const normChap = normalizeKey(chapterName);
  const normExam = normalizeKey(examSlug || '');

  // 1. Check direct matches in Mathematics & Quant
  for (const [key, topics] of Object.entries(MATH_CHAPTER_TOPICS)) {
    if (normChap.includes(key) || key.includes(normChap)) {
      return topics;
    }
  }

  // 2. Check direct matches in Reasoning
  for (const [key, topics] of Object.entries(REASONING_CHAPTER_TOPICS)) {
    if (normChap.includes(key) || key.includes(normChap)) {
      return topics;
    }
  }

  // 3. Check direct matches in General Awareness
  for (const [key, topics] of Object.entries(GA_CHAPTER_TOPICS)) {
    if (normChap.includes(key) || key.includes(normChap)) {
      return topics;
    }
  }

  // 4. Check direct matches in BSE (Railway Technical)
  for (const [key, topics] of Object.entries(BSE_CHAPTER_TOPICS)) {
    if (normChap.includes(key) || key.includes(normChap)) {
      return topics;
    }
  }

  // 5. Check direct matches in Medical & Science
  for (const [key, topics] of Object.entries(MEDICAL_SCIENCE_TOPICS)) {
    if (normChap.includes(key) || key.includes(normChap)) {
      return topics;
    }
  }

  // 6. Contextual Subject Keyword Matching
  // History
  if (normSub.includes('history') || normChap.includes('history') || normChap.includes('national movement')) {
    if (normChap.includes('ancient') || normChap.includes('harappa') || normChap.includes('vedic')) {
      return GA_CHAPTER_TOPICS['history ancient'];
    }
    if (normChap.includes('medieval') || normChap.includes('mughal') || normChap.includes('sultanate')) {
      return GA_CHAPTER_TOPICS['history medieval'];
    }
    return GA_CHAPTER_TOPICS['history modern'];
  }

  // Polity & Constitution
  if (
    normSub.includes('polity') ||
    normSub.includes('constitution') ||
    normChap.includes('constitution') ||
    normChap.includes('polity') ||
    normChap.includes('rights') ||
    normChap.includes('parliament')
  ) {
    return GA_CHAPTER_TOPICS['polity constitution'];
  }

  // Geography
  if (normSub.includes('geography') || normChap.includes('geography')) {
    if (normChap.includes('world') || normChap.includes('ocean') || normChap.includes('climate')) {
      return GA_CHAPTER_TOPICS['geography world'];
    }
    return GA_CHAPTER_TOPICS['geography india'];
  }

  // Economy
  if (normSub.includes('economy') || normSub.includes('economic') || normChap.includes('economy')) {
    return GA_CHAPTER_TOPICS['economy'];
  }

  // Railways Specific
  if (normSub.includes('railway') || normChap.includes('railway') || normExam.includes('rrb') || normExam.includes('rpf')) {
    if (normChap.includes('operating') || normChap.includes('control') || normChap.includes('block')) {
      return [
        'General & Subsidiary Rules (G&SR) & Block Working',
        'Train Ordering, Control Charting & Traffic Priorities',
        'Absolute Block & Automatic Block Signalling Systems',
        'Caution Orders, Speed Restrictions & Line Block Protocol',
        'Unusual Occurrences, Accidents & Relief Train Protocols',
      ];
    }
    if (normChap.includes('network') || normChap.includes('security') || normChap.includes('protocol')) {
      return GA_CHAPTER_TOPICS['railways general'];
    }
  }

  // Physics
  if (normSub.includes('physic') || normChap.includes('physic')) {
    if (normChap.includes('motion') || normChap.includes('kinematic')) return MEDICAL_SCIENCE_TOPICS['kinematics'];
    if (normChap.includes('law') || normChap.includes('force')) return MEDICAL_SCIENCE_TOPICS['laws of motion'];
    if (normChap.includes('work') || normChap.includes('energy')) return MEDICAL_SCIENCE_TOPICS['work energy and power'];
    if (normChap.includes('gravitat')) return MEDICAL_SCIENCE_TOPICS['gravitation'];
    if (normChap.includes('thermodynam') || normChap.includes('heat')) return MEDICAL_SCIENCE_TOPICS['thermodynamics'];
    if (normChap.includes('electr') || normChap.includes('current')) return MEDICAL_SCIENCE_TOPICS['current electricity'];
    if (normChap.includes('optic') || normChap.includes('light')) return MEDICAL_SCIENCE_TOPICS['optics'];
    return MEDICAL_SCIENCE_TOPICS['modern physics'];
  }

  // Chemistry
  if (normSub.includes('chemis') || normChap.includes('chemis')) {
    if (normChap.includes('organic') || normChap.includes('carbon')) return MEDICAL_SCIENCE_TOPICS['organic chemistry'];
    if (normChap.includes('bond')) return MEDICAL_SCIENCE_TOPICS['chemical bonding'];
    if (normChap.includes('hydrocarbon')) return MEDICAL_SCIENCE_TOPICS['hydrocarbons'];
    if (normChap.includes('solution')) return MEDICAL_SCIENCE_TOPICS['solutions'];
    if (normChap.includes('electrochem')) return MEDICAL_SCIENCE_TOPICS['electrochemistry'];
    return MEDICAL_SCIENCE_TOPICS['thermodynamics chemistry'];
  }

  // Biology / Life Sciences
  if (normSub.includes('bio') || normSub.includes('botan') || normSub.includes('zool') || normChap.includes('bio')) {
    if (normChap.includes('plant')) return MEDICAL_SCIENCE_TOPICS['plant kingdom'];
    if (normChap.includes('animal')) return MEDICAL_SCIENCE_TOPICS['animal kingdom'];
    if (normChap.includes('cell')) return MEDICAL_SCIENCE_TOPICS['cell the unit of life'];
    if (normChap.includes('genet')) return MEDICAL_SCIENCE_TOPICS['genetics and evolution'];
    return MEDICAL_SCIENCE_TOPICS['human physiology'];
  }

  // English Comprehension
  if (normSub.includes('english') || normSub.includes('verbal') || normSub.includes('language')) {
    if (normChap.includes('reading') || normChap.includes('comprehension')) {
      return [
        'Central Theme, Main Idea & Tone Identification',
        'Direct Factual & Supporting Detail Questions',
        'Inference & Author\'s Intent Analysis',
        'Contextual Vocabulary & Antonym/Synonym in Passage',
      ];
    }
    if (normChap.includes('grammar') || normChap.includes('error') || normChap.includes('spotting')) {
      return [
        'Subject-Verb Agreement & Plural Rules',
        'Tenses, Conditionals & Sequence of Tenses',
        'Prepositions, Phrasal Verbs & Fixed Prepositions',
        'Pronouns, Modifiers & Parallelism',
      ];
    }
    return [
      'Vocabulary: High-Frequency Exam Words',
      'Synonyms & Antonyms in Context',
      'Idioms, Phrases & One Word Substitutions',
      'Sentence Rearrangement (Para Jumbles)',
      'Cloze Test & Fill in the Blanks Techniques',
    ];
  }

  // Universal Fallback: 4 High-Yield Conceptual Pillars
  return [
    `Foundational Principles & Core Concepts of ${chapterName}`,
    `Important Theorems, Formulas & Methodologies`,
    `Standard Exam Models & Frequently Asked Questions`,
    `Advanced Problem Solving & Practical Applications`,
  ];
}
