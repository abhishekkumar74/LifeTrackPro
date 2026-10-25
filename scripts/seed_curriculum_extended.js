const fetch = require('node-fetch');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zvfeafmixnevqbelxnqp';

async function runQuery(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!response.ok) {
    throw new Error(`Supabase API error (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

const SEED_DATA = {
  exams: [
    {
      name: 'JEE Advanced',
      slug: 'jee-advanced',
      category: 'student',
      exam_type: 'entrance',
      popularity_score: 985,
      description: 'IIT Joint Entrance Examination (Advanced) for B.Tech Admissions in IITs',
      color: '#4F46E5',
      icon_name: 'award',
    },
    {
      name: 'NEET UG',
      slug: 'neet',
      category: 'student',
      exam_type: 'entrance',
      popularity_score: 990,
      description: 'National Eligibility cum Entrance Test for Medical (MBBS/BDS) Admissions',
      color: '#10B981',
      icon_name: 'activity',
    },
    {
      name: 'B.Tech Computer Science (CSE)',
      slug: 'btech-cse',
      category: 'student',
      exam_type: 'professional',
      popularity_score: 970,
      description: 'Complete 4-Year B.Tech CSE Curriculum: DSA, Core CS, System Design & SDE Placements',
      color: '#6366F1',
      icon_name: 'code',
    },
  ],
  subjects: [
    { name: 'Biology (Botany & Zoology)', code: 'BIO', color: '#10B981', icon_name: 'activity' },
    { name: 'Data Structures & Algorithms', code: 'DSA', color: '#5B4FE8', icon_name: 'code' },
    { name: 'Computer Science Fundamentals', code: 'CS_CORE', color: '#3B82F6', icon_name: 'cpu' },
    { name: 'System Design', code: 'SD', color: '#06B6D4', icon_name: 'layers' },
    { name: 'Object Oriented Design (OOD)', code: 'OOD', color: '#EC4899', icon_name: 'box' },
    { name: 'Java Programming', code: 'JAVA', color: '#F59E0B', icon_name: 'terminal' },
    { name: 'Backend Development', code: 'BACKEND', color: '#10B981', icon_name: 'server' },
    { name: 'Web Development', code: 'WEB', color: '#8B5CF6', icon_name: 'globe' },
    { name: 'Cloud & DevOps', code: 'DEVOPS', color: '#0284C7', icon_name: 'cloud' },
    { name: 'Interview Preparation', code: 'INTERVIEW', color: '#F43F5E', icon_name: 'briefcase' },
  ],
  curriculum: [
    // === JEE ADVANCED ===
    {
      examSlug: 'jee-advanced',
      subjectName: 'Physics',
      displayName: 'Physics',
      orderIndex: 1,
      chapters: [
        'General Physics & Vectors',
        'Kinematics & Relative Motion',
        'Newton\'s Laws & Friction',
        'Work, Power & Energy',
        'Center of Mass & Collisions',
        'Rotational Dynamics & Rigid Body Mechanics',
        'Gravitation & Planetary Motion',
        'Fluid Mechanics & Surface Tension',
        'Simple Harmonic Motion (SHM) & Waves',
        'Thermal Physics & Kinetic Theory of Gases',
        'Electrostatics & Capacitance',
        'Current Electricity & Circuit Analysis',
        'Magnetic Effects of Current & Magnetism',
        'Electromagnetic Induction (EMI) & AC',
        'Geometrical Optics & Optical Instruments',
        'Wave Optics & Interference',
        'Modern Physics & Photoelectric Effect',
        'Nuclear Physics & Radioactivity',
      ],
    },
    {
      examSlug: 'jee-advanced',
      subjectName: 'Chemistry',
      displayName: 'Chemistry',
      orderIndex: 2,
      chapters: [
        'Mole Concept & Redox Reactions',
        'Atomic Structure & Quantum Mechanics',
        'Chemical Bonding & Molecular Orbital Theory',
        'Chemical & Ionic Equilibrium',
        'Chemical Thermodynamics & Thermochemistry',
        'Electrochemistry & Conductance',
        'Chemical Kinetics & Nuclear Chemistry',
        'Liquid Solutions & Colligative Properties',
        'Solid State & Surface Chemistry',
        'Coordination Compounds & Isomerism',
        'p-Block Elements (Groups 13 to 18)',
        'd & f-Block Elements & Metallurgy',
        'Qualitative Inorganic Analysis (Salt Analysis)',
        'General Organic Chemistry (GOC) & Reaction Mechanisms',
        'Hydrocarbons (Alkanes, Alkenes, Alkynes)',
        'Alkyl & Aryl Halides',
        'Alcohols, Phenols & Ethers',
        'Aldehydes, Ketones & Carboxylic Acids',
        'Nitrogen Compounds (Amines & Diazonium Salts)',
        'Biomolecules & Practical Organic Chemistry',
      ],
    },
    {
      examSlug: 'jee-advanced',
      subjectName: 'Mathematics',
      displayName: 'Mathematics',
      orderIndex: 3,
      chapters: [
        'Sets, Relations & Functions',
        'Complex Numbers & Geometry',
        'Quadratic Equations & Inequalities',
        'Sequences & Series (AP, GP, HP, AGP)',
        'Matrices & Determinants',
        'Permutations, Combinations & Binomial Theorem',
        'Probability & Bayes\' Theorem',
        'Trigonometric Functions & Equations',
        'Inverse Trigonometric Functions',
        'Straight Lines & Circles',
        'Conic Sections (Parabola, Ellipse, Hyperbola)',
        'Limits, Continuity & Differentiability',
        'Application of Derivatives (Tangents, Maxima/Minima)',
        'Indefinite Integration',
        'Definite Integration & Area Under Curves',
        'Differential Equations',
        'Vector Algebra',
        'Three-Dimensional Geometry (3D)',
      ],
    },

    // === NEET UG ===
    {
      examSlug: 'neet',
      subjectName: 'Physics',
      displayName: 'Physics',
      orderIndex: 1,
      chapters: [
        'Units, Dimensions & Errors',
        'Motion in a Straight Line & Plane',
        'Laws of Motion & Friction',
        'Work, Energy & Power',
        'System of Particles & Rotational Motion',
        'Gravitation',
        'Mechanical Properties of Solids & Fluids',
        'Thermal Properties of Matter & Thermodynamics',
        'Kinetic Theory of Gases',
        'Oscillations & Waves',
        'Electrostatics & Capacitance',
        'Current Electricity',
        'Magnetic Effects of Current & Magnetism',
        'Electromagnetic Induction & Alternating Current',
        'Ray Optics & Wave Optics',
        'Dual Nature of Radiation, Atoms & Nuclei',
        'Semiconductor Electronics',
      ],
    },
    {
      examSlug: 'neet',
      subjectName: 'Chemistry',
      displayName: 'Chemistry',
      orderIndex: 2,
      chapters: [
        'Some Basic Concepts of Chemistry (Mole Concept)',
        'Structure of Atom',
        'Classification of Elements & Periodicity',
        'Chemical Bonding & Molecular Structure',
        'Thermodynamics',
        'Equilibrium (Chemical & Ionic)',
        'Redox Reactions & Electrochemistry',
        'Chemical Kinetics',
        'Solutions',
        'p-Block, d-Block & f-Block Elements',
        'Coordination Compounds',
        'General Principles of Organic Chemistry (GOC)',
        'Hydrocarbons',
        'Haloalkanes & Haloarenes',
        'Alcohols, Phenols & Ethers',
        'Aldehydes, Ketones & Carboxylic Acids',
        'Organic Compounds Containing Nitrogen (Amines)',
        'Biomolecules',
      ],
    },
    {
      examSlug: 'neet',
      subjectName: 'Biology (Botany & Zoology)',
      displayName: 'Biology',
      orderIndex: 3,
      chapters: [
        'The Living World & Biological Classification',
        'Plant Kingdom',
        'Animal Kingdom',
        'Morphology & Anatomy of Flowering Plants',
        'Structural Organisation in Animals',
        'Cell: The Unit of Life & Cell Cycle',
        'Biomolecules in Living Organisms',
        'Photosynthesis in Higher Plants',
        'Respiration in Plants & Plant Growth',
        'Breathing & Exchange of Gases',
        'Body Fluids & Circulation',
        'Excretory Products & Their Elimination',
        'Locomotion & Movement',
        'Neural Control & Chemical Coordination',
        'Sexual Reproduction in Flowering Plants',
        'Human Reproduction & Reproductive Health',
        'Principles of Inheritance & Variation (Genetics)',
        'Molecular Basis of Inheritance',
        'Evolution',
        'Human Health & Disease',
        'Microbes in Human Welfare',
        'Biotechnology: Principles & Processes',
        'Biotechnology & Its Applications',
        'Organisms, Populations & Ecosystem',
        'Biodiversity & Conservation',
      ],
    },

    // === B.TECH COMPUTER SCIENCE & ENGINEERING (CSE) ===
    {
      examSlug: 'btech-cse',
      subjectName: 'Data Structures & Algorithms',
      displayName: 'Data Structures & Algorithms',
      orderIndex: 1,
      chapters: [
        'Arrays & Strings (Two Pointers, Sliding Window)',
        'Linked List (Singly, Doubly, Floyd Cycle, Reversal)',
        'Stack & Queue (Monotonic Stack, Circular Queue)',
        'Recursion & Backtracking (Subsets, N-Queens)',
        'Trees & Traversals (Binary Tree, Views, Diameter)',
        'Binary Search Tree (Validation, LCA, Inorder Successor)',
        'Heaps & Priority Queue (Top K Elements, Median Finder)',
        'Graphs (BFS, DFS, Dijkstra, Bellman-Ford, Disjoint Set)',
        'Dynamic Programming (1D, 2D, Knapsack, LCS, LIS)',
        'Sorting & Searching Algorithms (Quick, Merge, Binary Search)',
        'Hashing & Hash Tables',
        'Greedy Algorithms (Activity Selection, Huffman)',
        'Trie (Prefix Tree, Autocomplete)',
        'Bit Manipulation & Bitmasking',
        'Segment Tree & Fenwick Tree (Binary Indexed Tree)',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Computer Science Fundamentals',
      displayName: 'Computer Science Fundamentals',
      orderIndex: 2,
      chapters: [
        'Operating Systems (Processes, Threads, CPU Scheduling)',
        'OS Concurrency (Deadlocks, Semaphores, Mutex)',
        'Memory Management (Paging, Virtual Memory, TLB)',
        'Computer Networks (OSI Model, TCP/IP, Sockets)',
        'Network Protocols (DNS, HTTP/HTTPS, WebSockets)',
        'Database Management Systems (Relational Model, SQL)',
        'DBMS Internals (ACID Properties, Transactions, Indexing, B+ Trees)',
        'Theory of Computation (Automata, Regular Grammars, Turing Machines)',
        'Compiler Design (Lexical Analysis, Parsing, Code Gen)',
        'Computer Architecture (Instruction Set, Pipelining, Cache Memory)',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'System Design',
      displayName: 'System Design (HLD)',
      orderIndex: 3,
      chapters: [
        'System Design Fundamentals (Scalability, Latency, Throughput)',
        'Databases & Replication (Sharding, Partitioning, CAP Theorem)',
        'Caching Strategies (Redis, Memcached, Cache Invalidation)',
        'Messaging & Event Streaming (Kafka, RabbitMQ, Pub/Sub)',
        'API Design & Rate Limiting (REST, gRPC, Token Bucket)',
        'Microservices Architecture & Service Discovery',
        'High Level Design: URL Shortener & Rate Limiter',
        'High Level Design: Chat Application (WhatsApp/Slack)',
        'High Level Design: Feed System (Twitter/Instagram)',
        'High Level Design: Video Streaming (YouTube/Netflix)',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Object Oriented Design (OOD)',
      displayName: 'Object Oriented Design (LLD)',
      orderIndex: 4,
      chapters: [
        'SOLID Principles & Clean Code Practices',
        'Creational Design Patterns (Singleton, Factory, Builder)',
        'Structural Design Patterns (Adapter, Decorator, Facade, Proxy)',
        'Behavioral Design Patterns (Observer, Strategy, Command, State)',
        'LLD Problem: Parking Lot System',
        'LLD Problem: BookMyShow / Movie Ticket Booking',
        'LLD Problem: Elevator System & Chess Game',
        'UML Class & Sequence Diagram Modeling',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Java Programming',
      displayName: 'Java Programming',
      orderIndex: 5,
      chapters: [
        'Java Fundamentals & Memory Management',
        'OOP in Java (Inheritance, Polymorphism, Encapsulation)',
        'Java Collections Framework (List, Set, Map, Queue internals)',
        'Exception Handling & Best Practices',
        'Java 8+ Features (Lambdas, Streams, Optional)',
        'Multithreading, Concurrency & ExecutorService',
        'JVM Internals & Garbage Collection Mechanics',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Backend Development',
      displayName: 'Backend Development',
      orderIndex: 6,
      chapters: [
        'Spring Boot Architecture & Dependency Injection',
        'RESTful API Development with Spring Web',
        'Data Persistence: Spring Data JPA & Hibernate ORM',
        'Node.js & Express.js Backend Architecture',
        'Authentication & Authorization (JWT, OAuth2, Session Security)',
        'Database Optimization & Connection Pooling',
        'Automated Testing (JUnit, Mockito, Integration Tests)',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Web Development',
      displayName: 'Web Development',
      orderIndex: 7,
      chapters: [
        'Frontend Fundamentals (HTML5, Modern CSS, ES6+ JavaScript)',
        'React.js Core Concepts (Components, Hooks, State Management)',
        'TypeScript for Scalable Fullstack Development',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Cloud & DevOps',
      displayName: 'Cloud & DevOps',
      orderIndex: 8,
      chapters: [
        'AWS Cloud Core Services (EC2, S3, RDS, Lambda)',
        'Docker Containerization & Multi-stage Builds',
        'Kubernetes Basics (Pods, Deployments, Services)',
        'CI/CD Pipelines (GitHub Actions, Automated Deployment)',
      ],
    },
    {
      examSlug: 'btech-cse',
      subjectName: 'Interview Preparation',
      displayName: 'Interview Preparation',
      orderIndex: 9,
      chapters: [
        'FAANG / MAANG Coding Interview Playbook',
        'LeetCode Top 75 & Blind 150 Patterns',
        'Low Level Design (Machine Coding) Round Prep',
        'High Level System Design Interview Framework',
        'CS Fundamentals Technical Rapid-Fire Prep',
        'Behavioral Interview Mastery (STAR Method & Leadership Principles)',
        'Resume Building, Projects & Mock Interviews',
      ],
    },
  ],
};

async function main() {
  console.log('🚀 Seeding Extended Curricula (JEE Advanced, NEET, B.Tech CSE)...');

  // 1. Insert or update Exams
  console.log('\n📚 1. Upserting Exams...');
  for (const ex of SEED_DATA.exams) {
    const sql = `
      INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
      VALUES (
        '${ex.name.replace(/'/g, "''")}',
        '${ex.slug}',
        '${ex.category}',
        '${ex.exam_type}',
        ${ex.popularity_score},
        '${ex.description.replace(/'/g, "''")}',
        '${ex.color}',
        '${ex.icon_name}',
        true
      )
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          category = EXCLUDED.category,
          exam_type = EXCLUDED.exam_type,
          popularity_score = EXCLUDED.popularity_score,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          icon_name = EXCLUDED.icon_name,
          is_active = true,
          updated_at = now()
      RETURNING id, name, slug;
    `;
    const res = await runQuery(sql);
    console.log(`  ✅ Exam: ${res[0]?.name} (${res[0]?.slug}) -> ${res[0]?.id}`);
  }

  // 2. Insert or update Subjects
  console.log('\n📖 2. Upserting Subjects...');
  for (const sub of SEED_DATA.subjects) {
    const sql = `
      INSERT INTO public.subjects (name, code, color, icon_name)
      VALUES (
        '${sub.name.replace(/'/g, "''")}',
        '${sub.code}',
        '${sub.color}',
        '${sub.icon_name}'
      )
      ON CONFLICT (name) DO UPDATE
      SET code = EXCLUDED.code,
          color = EXCLUDED.color,
          icon_name = EXCLUDED.icon_name,
          updated_at = now()
      RETURNING id, name;
    `;
    const res = await runQuery(sql);
    console.log(`  ✅ Subject: ${res[0]?.name} -> ${res[0]?.id}`);
  }

  // 3. Link Exam Subjects and insert Chapters
  console.log('\n🔗 3. Linking Exam Subjects & Inserting Chapters...');
  let totalChapters = 0;

  for (const item of SEED_DATA.curriculum) {
    // 3a. Upsert junction
    const linkSql = `
      WITH e AS (SELECT id FROM public.exams WHERE slug = '${item.examSlug}'),
           s AS (SELECT id FROM public.subjects WHERE name = '${item.subjectName.replace(/'/g, "''")}')
      INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
      SELECT e.id, s.id, '${item.displayName.replace(/'/g, "''")}', ${item.orderIndex}
      FROM e, s
      ON CONFLICT (exam_id, subject_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          order_index = EXCLUDED.order_index,
          updated_at = now()
      RETURNING id;
    `;
    const linkRes = await runQuery(linkSql);
    const examSubjectId = linkRes[0]?.id;

    if (!examSubjectId) {
      console.warn(`  ⚠️ Could not link ${item.examSlug} <-> ${item.subjectName}`);
      continue;
    }

    // 3b. Delete existing chapters for this junction to allow clean re-seed
    await runQuery(`DELETE FROM public.exam_chapters WHERE exam_subject_id = '${examSubjectId}';`);

    // 3c. Insert chapters
    const chapterValues = item.chapters.map((chName, idx) => {
      return `('${examSubjectId}'::uuid, '${chName.replace(/'/g, "''")}', ${idx + 1}, 6)`;
    }).join(',\n');

    const insertChaptersSql = `
      INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours)
      VALUES ${chapterValues};
    `;
    await runQuery(insertChaptersSql);
    totalChapters += item.chapters.length;

    console.log(`  ✅ [${item.examSlug}] ${item.displayName}: ${item.chapters.length} chapters`);
  }

  console.log(`\n🎉 Total new chapters seeded: ${totalChapters}`);

  // 4. Verify overall Database state
  console.log('\n📊 Database Summary Verification:');
  const summarySql = `
    SELECT 
      e.name AS exam_name,
      e.slug,
      count(DISTINCT es.id) AS subject_count,
      count(ec.id) AS chapter_count
    FROM public.exams e
    LEFT JOIN public.exam_subjects es ON es.exam_id = e.id
    LEFT JOIN public.exam_chapters ec ON ec.exam_subject_id = es.id
    GROUP BY e.name, e.slug, e.popularity_score
    ORDER BY e.popularity_score DESC;
  `;
  const summary = await runQuery(summarySql);
  console.table(summary);
}

main().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
