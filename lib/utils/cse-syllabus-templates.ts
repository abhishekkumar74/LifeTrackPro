// lib/utils/cse-syllabus-templates.ts
// Complete CSE Syllabus with Interview Preparation
// Auto-generated — do not edit manually

export interface SyllabusSubject {
  topics: string[]
}

export interface SyllabusCategory {
  color: string
  icon: string
  subjects: Record<string, SyllabusSubject>
}

export const CSE_SYLLABUS: Record<string, SyllabusCategory> = 
{
  "Data Structures & Algorithms": {
    "color": "#5B4FE8",
    "icon": "🧮",
    "subjects": {
      "Arrays & Strings": {
        "topics": [
          "Array basics and memory representation",
          "Two pointer technique",
          "Sliding window technique",
          "Prefix sum and difference arrays",
          "Kadane's algorithm (Maximum subarray)",
          "Dutch national flag problem",
          "Boyer-Moore voting algorithm",
          "String manipulation basics",
          "String hashing (Rabin-Karp)",
          "KMP string matching algorithm",
          "Z-algorithm",
          "Anagram and palindrome problems",
          "Subarray and subsequence problems",
          "Matrix rotation and spiral traversal",
          "2D array problems"
        ]
      },
      "Linked List": {
        "topics": [
          "Singly linked list operations",
          "Doubly linked list operations",
          "Circular linked list",
          "Reverse a linked list (iterative + recursive)",
          "Detect and remove cycle (Floyd's algorithm)",
          "Merge two sorted linked lists",
          "Find middle of linked list",
          "Intersection of two linked lists",
          "Add two numbers as linked lists",
          "Deep copy with random pointers",
          "LRU cache implementation",
          "Skip list basics"
        ]
      },
      "Stack & Queue": {
        "topics": [
          "Stack using array and linked list",
          "Queue using array and linked list",
          "Circular queue",
          "Deque (double-ended queue)",
          "Valid parentheses problem",
          "Next greater element (monotonic stack)",
          "Largest rectangle in histogram",
          "Implement stack using queues",
          "Implement queue using stacks",
          "Min stack and max stack",
          "Sliding window maximum",
          "Stock span problem",
          "Celebrity problem"
        ]
      },
      "Recursion & Backtracking": {
        "topics": [
          "Recursion fundamentals and call stack",
          "Tail recursion",
          "Tower of Hanoi",
          "Fibonacci (memoized)",
          "Subsets and power set",
          "Permutations of a string/array",
          "Combinations and combination sum",
          "N-Queens problem",
          "Sudoku solver",
          "Rat in a maze",
          "Word search in matrix",
          "Palindrome partitioning",
          "Letter combinations of phone number",
          "Generate parentheses"
        ]
      },
      "Trees": {
        "topics": [
          "Binary tree representation",
          "Tree traversals: inorder, preorder, postorder",
          "Level order traversal (BFS)",
          "Height and depth of tree",
          "Diameter of binary tree",
          "Lowest common ancestor (LCA)",
          "Maximum path sum",
          "Symmetric tree check",
          "Binary tree to DLL conversion",
          "Serialize and deserialize tree",
          "Vertical order traversal",
          "Boundary traversal",
          "Morris traversal (O(1) space)",
          "Segment tree",
          "Fenwick tree (Binary indexed tree)"
        ]
      },
      "Binary Search Tree": {
        "topics": [
          "BST insertion, deletion, search",
          "Validate BST",
          "Kth smallest/largest in BST",
          "Inorder successor and predecessor",
          "Floor and ceiling in BST",
          "Convert sorted array to BST",
          "Merge two BSTs",
          "BST to greater sum tree",
          "Two sum in BST",
          "Count nodes in BST range",
          "Balanced BST (AVL basics)",
          "Red-Black tree basics"
        ]
      },
      "Heaps & Priority Queue": {
        "topics": [
          "Min heap and max heap",
          "Heapify and heap operations",
          "Heap sort",
          "Kth largest/smallest element",
          "Merge K sorted arrays/lists",
          "Top K frequent elements",
          "Find median in data stream",
          "Sliding window median",
          "Task scheduler",
          "Dijkstra using priority queue",
          "Huffman encoding",
          "Custom comparator in heap"
        ]
      },
      "Graphs": {
        "topics": [
          "Graph representation (adjacency list/matrix)",
          "BFS (Breadth First Search)",
          "DFS (Depth First Search)",
          "Cycle detection (directed + undirected)",
          "Topological sorting (DFS + Kahn's)",
          "Shortest path: BFS (unweighted)",
          "Dijkstra's algorithm",
          "Bellman-Ford algorithm",
          "Floyd-Warshall algorithm",
          "Minimum spanning tree: Prim's algorithm",
          "Minimum spanning tree: Kruskal's algorithm",
          "Union-Find (Disjoint Set Union)",
          "Strongly connected components (Kosaraju's)",
          "Articulation points and bridges",
          "Bipartite graph check",
          "Word ladder problem",
          "Number of islands",
          "Clone a graph"
        ]
      },
      "Dynamic Programming": {
        "topics": [
          "DP fundamentals: overlapping subproblems",
          "Memoization vs tabulation",
          "0/1 Knapsack problem",
          "Unbounded knapsack",
          "Coin change problem",
          "Longest common subsequence (LCS)",
          "Longest increasing subsequence (LIS)",
          "Edit distance (Levenshtein)",
          "Matrix chain multiplication",
          "Palindrome DP (longest palindromic subsequence)",
          "Rod cutting problem",
          "Egg drop problem",
          "Word break problem",
          "Partition equal subset sum",
          "DP on trees",
          "DP on grids",
          "Bitmask DP",
          "Digit DP basics"
        ]
      },
      "Sorting Algorithms": {
        "topics": [
          "Bubble sort",
          "Selection sort",
          "Insertion sort",
          "Merge sort",
          "Quick sort (Lomuto + Hoare partition)",
          "Heap sort",
          "Counting sort",
          "Radix sort",
          "Bucket sort",
          "Tim sort (used in Java/Python)",
          "Sorting stability concepts",
          "Time-space complexity comparison"
        ]
      },
      "Searching Algorithms": {
        "topics": [
          "Linear search",
          "Binary search (iterative + recursive)",
          "Binary search on answer",
          "Search in rotated sorted array",
          "Find peak element",
          "Search in 2D matrix",
          "Ternary search",
          "Exponential search",
          "Interpolation search"
        ]
      },
      "Hashing": {
        "topics": [
          "Hash functions and collision handling",
          "Chaining and open addressing",
          "HashMap and HashSet usage",
          "Two sum using hash map",
          "Subarray with given sum (prefix + hash)",
          "Count distinct elements in windows",
          "Group anagrams",
          "Longest consecutive sequence",
          "4Sum and 3Sum problems",
          "Custom hashCode in Java",
          "Consistent hashing basics"
        ]
      },
      "Greedy Algorithms": {
        "topics": [
          "Activity selection problem",
          "Fractional knapsack",
          "Job sequencing with deadlines",
          "Minimum platforms (railway problem)",
          "Huffman coding",
          "Jump game (I and II)",
          "Gas station problem",
          "Assign cookies",
          "Greedy interval scheduling",
          "Minimum number of arrows to burst balloons"
        ]
      },
      "Trie (Prefix Tree)": {
        "topics": [
          "Trie insertion and search",
          "Word search using trie",
          "Autocomplete feature",
          "Longest common prefix",
          "Count words with given prefix",
          "Replace words",
          "Maximum XOR using trie",
          "Palindrome pairs using trie"
        ]
      },
      "Bit Manipulation": {
        "topics": [
          "AND, OR, XOR, NOT, shifts",
          "Check if power of 2",
          "Count set bits (Brian Kernighan)",
          "XOR tricks (find missing number)",
          "Subset generation using bits",
          "Single number problems",
          "Reverse bits",
          "Bit masking in DP",
          "Swap without temp variable",
          "Find two non-repeating numbers"
        ]
      }
    }
  },
  "Java Programming": {
    "color": "#E85858",
    "icon": "☕",
    "subjects": {
      "Java Fundamentals": {
        "topics": [
          "JVM, JRE, JDK architecture",
          "Data types and variables",
          "Operators and expressions",
          "Control flow: if, switch, loops",
          "Arrays in Java",
          "Varargs",
          "String class and StringBuilder",
          "String pool and interning",
          "Autoboxing and unboxing",
          "Wrapper classes",
          "Math and utility classes",
          "Scanner and input handling"
        ]
      },
      "OOP in Java": {
        "topics": [
          "Classes and objects",
          "Constructors and constructor chaining",
          "this and super keywords",
          "Inheritance (single, multilevel, hierarchical)",
          "Method overriding and overloading",
          "Polymorphism (compile + runtime)",
          "Abstraction (abstract classes)",
          "Interfaces and default methods",
          "Encapsulation and access modifiers",
          "Static and final keywords",
          "Inner classes (static, local, anonymous)",
          "Enum in Java",
          "Record classes (Java 16+)"
        ]
      },
      "Java Collections Framework": {
        "topics": [
          "Collection hierarchy overview",
          "ArrayList vs LinkedList",
          "Stack and Queue in Java",
          "ArrayDeque",
          "HashMap, LinkedHashMap, TreeMap",
          "HashSet, LinkedHashSet, TreeSet",
          "PriorityQueue (min/max heap)",
          "Iterator and ListIterator",
          "Comparable vs Comparator",
          "Collections utility class",
          "Unmodifiable and synchronized collections",
          "CopyOnWriteArrayList (thread-safe)"
        ]
      },
      "Exception Handling": {
        "topics": [
          "Exception hierarchy (Throwable, Error, Exception)",
          "Checked vs unchecked exceptions",
          "try-catch-finally",
          "try-with-resources",
          "throw and throws",
          "Custom exceptions",
          "Multi-catch (Java 7+)",
          "Exception chaining",
          "Best practices in exception handling",
          "NullPointerException prevention patterns"
        ]
      },
      "Java 8+ Features": {
        "topics": [
          "Lambda expressions",
          "Functional interfaces",
          "Stream API (filter, map, reduce, collect)",
          "Collectors class",
          "Optional class",
          "Method references",
          "Default and static methods in interfaces",
          "Date and Time API (LocalDate, LocalDateTime)",
          "CompletableFuture basics",
          "Var keyword (Java 10)",
          "Text blocks (Java 13)",
          "Records (Java 14)",
          "Sealed classes (Java 17)",
          "Pattern matching instanceof"
        ]
      },
      "Multithreading & Concurrency": {
        "topics": [
          "Thread lifecycle",
          "Creating threads (Thread class + Runnable)",
          "Synchronization and synchronized blocks",
          "Volatile keyword",
          "wait, notify, notifyAll",
          "Deadlock and how to avoid it",
          "ThreadLocal",
          "Executor framework (ExecutorService)",
          "Future and Callable",
          "CountDownLatch, CyclicBarrier, Semaphore",
          "ReentrantLock vs synchronized",
          "ConcurrentHashMap and atomic classes",
          "Fork/Join framework",
          "Virtual threads (Java 21)"
        ]
      },
      "JVM Internals": {
        "topics": [
          "Classloading mechanism",
          "JVM memory model (heap, stack, metaspace)",
          "Garbage collection algorithms (G1, ZGC)",
          "Memory leaks and detection",
          "JVM tuning flags (-Xmx, -Xms)",
          "JIT compilation",
          "Profiling with VisualVM/JProfiler",
          "Class file structure",
          "Bytecode basics"
        ]
      }
    }
  },
  "Object Oriented Design (OOD)": {
    "color": "#00B894",
    "icon": "🎯",
    "subjects": {
      "SOLID Principles": {
        "topics": [
          "Single Responsibility Principle",
          "Open/Closed Principle",
          "Liskov Substitution Principle",
          "Interface Segregation Principle",
          "Dependency Inversion Principle",
          "SOLID violations and refactoring",
          "Real-world examples of each principle"
        ]
      },
      "Design Patterns - Creational": {
        "topics": [
          "Singleton pattern (thread-safe)",
          "Factory method pattern",
          "Abstract factory pattern",
          "Builder pattern",
          "Prototype pattern",
          "Object pool pattern",
          "Dependency injection"
        ]
      },
      "Design Patterns - Structural": {
        "topics": [
          "Adapter pattern",
          "Bridge pattern",
          "Composite pattern",
          "Decorator pattern",
          "Facade pattern",
          "Flyweight pattern",
          "Proxy pattern"
        ]
      },
      "Design Patterns - Behavioral": {
        "topics": [
          "Observer pattern (event systems)",
          "Strategy pattern",
          "Command pattern",
          "Template method pattern",
          "Iterator pattern",
          "Chain of responsibility",
          "State pattern",
          "Mediator pattern",
          "Memento pattern",
          "Visitor pattern"
        ]
      },
      "Low Level Design Problems": {
        "topics": [
          "Design a parking lot system",
          "Design an elevator system",
          "Design a chess game",
          "Design a library management system",
          "Design a hotel booking system",
          "Design a food delivery app (Zomato/Swiggy)",
          "Design an ATM machine",
          "Design a vending machine",
          "Design a ride-sharing app (Uber/Ola)",
          "Design a movie ticket booking (BookMyShow)",
          "Design an online shopping cart",
          "Design a social media feed",
          "Design a notification system",
          "Design a rate limiter"
        ]
      },
      "UML & Modeling": {
        "topics": [
          "Class diagrams",
          "Sequence diagrams",
          "Use case diagrams",
          "State diagrams",
          "Entity-relationship diagrams",
          "UML to code translation"
        ]
      }
    }
  },
  "System Design": {
    "color": "#E8A020",
    "icon": "🏗️",
    "subjects": {
      "Fundamentals": {
        "topics": [
          "Client-server architecture",
          "Monolithic vs microservices",
          "Horizontal vs vertical scaling",
          "Load balancing algorithms (Round Robin, Least Connections, IP Hash)",
          "Caching strategies (Write-through, Write-back, Cache-aside)",
          "CAP theorem",
          "PACELC theorem",
          "Consistency models (eventual, strong, causal)",
          "Latency vs throughput",
          "Availability and reliability (SLA, SLO, SLI)",
          "Fault tolerance and resilience patterns"
        ]
      },
      "Databases": {
        "topics": [
          "SQL vs NoSQL — when to use which",
          "ACID properties",
          "Database normalization (1NF, 2NF, 3NF, BCNF)",
          "Indexing (B-tree, Hash index, Full-text)",
          "Query optimization and EXPLAIN",
          "Database sharding strategies",
          "Database replication (master-slave, master-master)",
          "Read replicas",
          "Connection pooling",
          "Time-series databases",
          "Column-oriented databases",
          "PostgreSQL internals",
          "MySQL vs PostgreSQL",
          "MongoDB and document stores",
          "Redis (caching, pub/sub, distributed locks)",
          "Cassandra (wide-column store)",
          "Elasticsearch (full-text search)"
        ]
      },
      "Caching": {
        "topics": [
          "Cache eviction policies (LRU, LFU, FIFO)",
          "Redis data structures",
          "Memcached vs Redis",
          "Distributed caching",
          "Cache invalidation strategies",
          "CDN (Content Delivery Network)",
          "Browser caching and HTTP cache headers",
          "Application-level vs database-level caching",
          "Cache stampede problem and solutions",
          "Hot key problem in distributed cache"
        ]
      },
      "Messaging & Event Streaming": {
        "topics": [
          "Message queues vs event streaming",
          "Kafka architecture (topics, partitions, brokers)",
          "Kafka producers and consumers",
          "Kafka consumer groups",
          "RabbitMQ basics",
          "SQS (AWS Simple Queue Service)",
          "Event-driven architecture",
          "CQRS pattern",
          "Event sourcing",
          "Pub/Sub pattern",
          "Dead letter queues",
          "Exactly-once delivery semantics"
        ]
      },
      "API Design": {
        "topics": [
          "REST API principles",
          "REST best practices and conventions",
          "HTTP methods and status codes",
          "API versioning strategies",
          "GraphQL vs REST vs gRPC",
          "gRPC and Protocol Buffers",
          "API Gateway pattern",
          "Rate limiting strategies (token bucket, leaky bucket)",
          "API authentication (API keys, JWT, OAuth 2.0)",
          "Pagination (cursor-based, offset-based)",
          "API documentation (OpenAPI/Swagger)",
          "Idempotency in APIs"
        ]
      },
      "Microservices": {
        "topics": [
          "Microservices principles",
          "Service decomposition strategies",
          "Inter-service communication (sync vs async)",
          "Service discovery (Consul, Eureka)",
          "Circuit breaker pattern (Hystrix, Resilience4j)",
          "Saga pattern for distributed transactions",
          "API Gateway vs service mesh",
          "Containerization with Docker",
          "Kubernetes basics",
          "Service mesh (Istio basics)",
          "Distributed tracing (Jaeger, Zipkin)",
          "Log aggregation (ELK stack)"
        ]
      },
      "High Level Design Problems": {
        "topics": [
          "Design YouTube/Netflix (video streaming)",
          "Design Twitter/X (social media feed)",
          "Design WhatsApp (messaging system)",
          "Design Instagram (photo sharing)",
          "Design Uber/Ola (ride sharing)",
          "Design Swiggy/Zomato (food delivery)",
          "Design Amazon (e-commerce)",
          "Design Google Search (search engine)",
          "Design Google Drive (file storage)",
          "Design Paytm/UPI (payment system)",
          "Design URL shortener (bit.ly)",
          "Design rate limiter",
          "Design notification system (10M users)",
          "Design news feed system",
          "Design distributed cache",
          "Design web crawler",
          "Design typeahead suggestion",
          "Design leaderboard system"
        ]
      },
      "Distributed Systems": {
        "topics": [
          "Distributed consensus (Paxos, Raft)",
          "Leader election",
          "Consistent hashing",
          "Gossip protocol",
          "Two-phase commit",
          "Distributed locks",
          "Vector clocks",
          "Lamport timestamps",
          "Bloom filters",
          "Count-min sketch",
          "HyperLogLog",
          "Distributed file systems (HDFS basics)"
        ]
      }
    }
  },
  "Backend Development": {
    "color": "#6C5CE7",
    "icon": "⚙️",
    "subjects": {
      "Spring Boot (Java)": {
        "topics": [
          "Spring Boot project setup",
          "Spring Core: IoC and DI",
          "Spring MVC: controllers, request mapping",
          "Spring Data JPA and Hibernate",
          "Spring Security basics",
          "JWT authentication with Spring Security",
          "Spring Boot actuator",
          "Application properties and profiles",
          "Exception handling (@ControllerAdvice)",
          "Validation (@Valid, @NotNull)",
          "Spring Boot testing (MockMvc, @SpringBootTest)",
          "Spring Boot caching (@Cacheable)",
          "Spring Boot with Docker",
          "Spring Cloud basics (Feign, Config Server)"
        ]
      },
      "REST API Development": {
        "topics": [
          "Building RESTful APIs in Spring/Node",
          "CRUD operations best practices",
          "Request/Response DTOs",
          "HTTP status code conventions",
          "Error handling and error responses",
          "Request validation",
          "API documentation with Swagger",
          "Pagination and filtering",
          "HATEOAS",
          "API versioning",
          "Idempotency keys",
          "Content negotiation"
        ]
      },
      "Databases (Hands-on)": {
        "topics": [
          "PostgreSQL setup and CRUD",
          "Complex SQL queries (JOINs, subqueries)",
          "Window functions",
          "Stored procedures and triggers",
          "Transaction management",
          "Connection pooling (HikariCP)",
          "JPA entities and relationships",
          "N+1 problem and fixes",
          "Query performance tuning",
          "Database migrations (Flyway/Liquibase)",
          "MongoDB with Spring Data",
          "Redis integration with Spring"
        ]
      },
      "Node.js Backend": {
        "topics": [
          "Node.js event loop",
          "Express.js framework",
          "Middleware in Express",
          "Authentication with JWT + bcrypt",
          "Sequelize or Prisma ORM",
          "MongoDB with Mongoose",
          "Error handling middleware",
          "Rate limiting (express-rate-limit)",
          "File upload (multer)",
          "WebSockets with Socket.io",
          "Environment variables (dotenv)",
          "Node.js testing (Jest + Supertest)"
        ]
      },
      "Authentication & Security": {
        "topics": [
          "Session vs token-based auth",
          "JWT (JSON Web Tokens) deep dive",
          "OAuth 2.0 flows",
          "OpenID Connect",
          "Password hashing (bcrypt, Argon2)",
          "HTTPS and TLS",
          "CORS configuration",
          "SQL injection prevention",
          "XSS prevention",
          "CSRF protection",
          "Input sanitization",
          "Secrets management",
          "API key management",
          "Role-based access control (RBAC)"
        ]
      },
      "DevOps & Deployment": {
        "topics": [
          "Git advanced (rebase, cherry-pick, stash)",
          "GitHub Actions CI/CD",
          "Docker: images, containers, volumes, networks",
          "Docker Compose for local development",
          "Kubernetes: pods, services, deployments",
          "AWS basics (EC2, S3, RDS, Lambda)",
          "Cloud deployment (AWS/GCP/Azure)",
          "Nginx as reverse proxy",
          "SSL/TLS certificate setup",
          "Environment configuration management",
          "Application monitoring (Prometheus + Grafana)",
          "Log management (ELK stack)",
          "Zero-downtime deployment strategies"
        ]
      },
      "Testing": {
        "topics": [
          "Unit testing principles",
          "JUnit 5 (Java) basics",
          "Mockito for mocking",
          "Integration testing",
          "Test-driven development (TDD)",
          "API testing with Postman",
          "Load testing with JMeter/K6",
          "Code coverage (JaCoCo)",
          "Contract testing",
          "E2E testing basics"
        ]
      }
    }
  },
  "Computer Science Fundamentals": {
    "color": "#0984E3",
    "icon": "💻",
    "subjects": {
      "Operating Systems": {
        "topics": [
          "Process vs thread",
          "Process states and lifecycle",
          "Context switching",
          "CPU scheduling algorithms (FCFS, SJF, Round Robin, Priority)",
          "Process synchronization",
          "Mutex, semaphore, monitors",
          "Deadlock: conditions, prevention, detection",
          "Memory management: paging, segmentation",
          "Virtual memory and page replacement",
          "File systems (FAT, NTFS, ext4)",
          "I/O management",
          "System calls",
          "Linux basics for developers",
          "Shell scripting basics"
        ]
      },
      "Computer Networks": {
        "topics": [
          "OSI model and TCP/IP model",
          "IP addressing and subnetting",
          "TCP vs UDP",
          "TCP 3-way handshake",
          "HTTP/HTTPS deep dive",
          "HTTP/1.1 vs HTTP/2 vs HTTP/3",
          "DNS resolution process",
          "CDN and edge computing",
          "WebSockets",
          "REST vs GraphQL vs gRPC",
          "SSL/TLS handshake",
          "Firewall and security basics",
          "VPN basics",
          "Load balancer types (L4 vs L7)",
          "Network debugging tools (ping, traceroute, curl, netstat)"
        ]
      },
      "Database Management Systems": {
        "topics": [
          "ER model and schema design",
          "Relational algebra",
          "SQL: DDL, DML, DCL, TCL",
          "Advanced SQL (window functions, CTEs)",
          "ACID properties in depth",
          "Transaction isolation levels",
          "Concurrency control (locks, MVCC)",
          "Indexing types and internals",
          "Query processing and optimization",
          "Normalization and denormalization",
          "NoSQL types and use cases",
          "NewSQL databases"
        ]
      },
      "Software Engineering": {
        "topics": [
          "SDLC models (Agile, Scrum, Kanban)",
          "Software requirements engineering",
          "Software architecture patterns (MVC, MVP, MVVM)",
          "Code review best practices",
          "Technical debt management",
          "Refactoring techniques",
          "Clean code principles",
          "Domain-driven design (DDD) basics",
          "Continuous Integration/Deployment",
          "Version control best practices",
          "Documentation writing"
        ]
      },
      "Theory of Computation": {
        "topics": [
          "Finite automata (DFA, NFA)",
          "Regular expressions and languages",
          "Context-free grammars",
          "Pushdown automata",
          "Turing machines",
          "Decidability and undecidability",
          "P vs NP problem",
          "NP-complete problems",
          "Time complexity classes",
          "Space complexity classes"
        ]
      },
      "Compiler Design": {
        "topics": [
          "Compilation phases overview",
          "Lexical analysis and tokenization",
          "Parsing (LL, LR parsers)",
          "Abstract syntax tree (AST)",
          "Symbol table",
          "Semantic analysis",
          "Code generation basics",
          "Optimization techniques",
          "Interpreter vs compiler vs JIT"
        ]
      },
      "Computer Architecture": {
        "topics": [
          "Von Neumann architecture",
          "CPU components (ALU, control unit, registers)",
          "Instruction set architecture (RISC vs CISC)",
          "Pipeline execution",
          "Cache hierarchy (L1, L2, L3)",
          "Cache coherence",
          "Memory hierarchy",
          "DRAM and SRAM",
          "Pipelining hazards",
          "Branch prediction",
          "Parallel processing basics"
        ]
      }
    }
  },
  "Interview Preparation": {
    "color": "#00B894",
    "icon": "🏆",
    "subjects": {
      "Amazon SDE Interview": {
        "topics": [
          "Amazon Leadership Principles (all 16)",
          "STAR method for behavioral questions",
          "Online Assessment: DSA problems (LeetCode Medium)",
          "Phone screen: 1 DSA + 1 LP question",
          "Onsite Loop Round 1: Arrays, Strings, DP",
          "Onsite Loop Round 2: Trees, Graphs, BFS/DFS",
          "Onsite Loop Round 3: System Design (SDE-2 and above)",
          "Onsite Loop Round 4: Behavioral (Bar Raiser round)",
          "Amazon-specific: Design Amazon Warehouse system",
          "Amazon-specific: Design recommendation engine",
          "Amazon-specific: Delivery optimization problem",
          "Common LP stories: ownership, customer obsession, deliver results",
          "LeetCode top 150 Amazon tagged problems",
          "Amazon compensation structure understanding"
        ]
      },
      "Google SWE Interview": {
        "topics": [
          "Google interview format overview",
          "Phone screen: 2 coding problems (45 min)",
          "Onsite Round 1: Coding (LC Hard level)",
          "Onsite Round 2: Coding (LC Hard level)",
          "Onsite Round 3: System Design",
          "Onsite Round 4: Googleyness + Leadership",
          "Onsite Round 5: Coding",
          "Google coding: emphasis on optimal solution",
          "Think aloud methodology at Google",
          "System design at Google scale",
          "Design Google Search",
          "Design Google Maps",
          "Design YouTube at Google scale",
          "LeetCode Google tagged top 100 problems",
          "Google Hiring Committee process understanding"
        ]
      },
      "Microsoft SWE Interview": {
        "topics": [
          "Microsoft interview format",
          "HackerRank online assessment",
          "Technical screen: 1-2 coding problems",
          "Onsite: 4-5 rounds (coding + design + behavioral)",
          "As Appropriate (AA) round",
          "Microsoft values alignment",
          "Design Microsoft Teams feature",
          "Design Azure blob storage",
          "LeetCode Microsoft tagged problems",
          "C# vs Java comparison (if applicable)"
        ]
      },
      "Meta (Facebook) Interview": {
        "topics": [
          "Meta interview format",
          "Coding: emphasis on clean + bug-free code",
          "System design: focus on scale (billions of users)",
          "Behavioral: Meta core values",
          "Design Facebook News Feed",
          "Design Instagram Stories",
          "Design WhatsApp messaging",
          "Meta product sense questions",
          "LeetCode Meta tagged problems",
          "Graph problems (Meta loves graphs)"
        ]
      },
      "Startup & Product Company Interview": {
        "topics": [
          "Full-stack problem solving",
          "Take-home projects evaluation",
          "Culture fit assessment",
          "Product thinking questions",
          "Architecture discussion",
          "Code quality review",
          "Debugging live code problems",
          "GitHub portfolio importance",
          "Open source contribution value",
          "Side project demonstration"
        ]
      },
      "LeetCode Strategy": {
        "topics": [
          "LeetCode problem-solving framework",
          "Neetcode 150 roadmap",
          "Blind 75 problems list",
          "Grind 75 problems list",
          "Company-specific LeetCode lists",
          "Optimal time management per problem",
          "Pattern recognition approach",
          "Communicating while coding",
          "Handling hints from interviewer",
          "Handling unknown problems (first principles)",
          "Testing your solution in interview",
          "Time and space complexity analysis out loud"
        ]
      },
      "Behavioral Interview Preparation": {
        "topics": [
          "STAR method framework",
          "Tell me about yourself (perfect pitch)",
          "Why this company? (research framework)",
          "Greatest strength and weakness",
          "Conflict resolution stories",
          "Failure and learning stories",
          "Leadership experience",
          "Working under pressure",
          "Ambiguous situation handling",
          "Disagreeing with manager",
          "Ownership and initiative examples",
          "Salary negotiation tactics"
        ]
      }
    }
  },
  "Web Development": {
    "color": "#E17055",
    "icon": "🌐",
    "subjects": {
      "Frontend Fundamentals": {
        "topics": [
          "HTML5 semantic elements",
          "CSS3 flexbox and grid",
          "Responsive design (media queries)",
          "CSS animations and transitions",
          "JavaScript ES6+ features",
          "DOM manipulation",
          "Event handling and bubbling",
          "Fetch API and Axios",
          "Async/await and Promises",
          "Browser storage (localStorage, sessionStorage, cookies)",
          "Web performance optimization",
          "Browser DevTools profiling"
        ]
      },
      "React.js": {
        "topics": [
          "JSX and virtual DOM",
          "Functional components and hooks",
          "useState and useEffect",
          "useContext and Context API",
          "useReducer for complex state",
          "useMemo and useCallback",
          "useRef and DOM manipulation",
          "Custom hooks",
          "React Router v6",
          "Code splitting and lazy loading",
          "React Query / TanStack Query",
          "State management: Zustand / Redux Toolkit",
          "Testing with React Testing Library",
          "Next.js basics"
        ]
      },
      "TypeScript": {
        "topics": [
          "TypeScript type system basics",
          "Interfaces and type aliases",
          "Generics",
          "Union and intersection types",
          "Type guards",
          "Enums",
          "Decorators",
          "TypeScript with React",
          "TypeScript strict mode",
          "Utility types (Partial, Required, Pick, Omit)"
        ]
      }
    }
  },
  "Cloud & DevOps": {
    "color": "#74B9FF",
    "icon": "☁️",
    "subjects": {
      "AWS": {
        "topics": [
          "AWS core services: EC2, S3, RDS, Lambda",
          "VPC and networking",
          "IAM roles and policies",
          "ECS and EKS (containers)",
          "CloudFront CDN",
          "Route 53 DNS",
          "SQS and SNS messaging",
          "DynamoDB",
          "CloudWatch monitoring",
          "AWS Lambda (serverless)",
          "API Gateway",
          "AWS SAM and CloudFormation basics",
          "Cost optimization strategies"
        ]
      },
      "Docker & Kubernetes": {
        "topics": [
          "Docker architecture",
          "Dockerfile best practices",
          "Docker Compose",
          "Container networking",
          "Volume management",
          "Image optimization",
          "Kubernetes architecture (nodes, pods, clusters)",
          "Deployments and ReplicaSets",
          "Services and ingress",
          "ConfigMaps and Secrets",
          "Horizontal Pod Autoscaling",
          "Kubernetes namespaces",
          "Helm charts basics",
          "kubectl commands"
        ]
      },
      "CI/CD": {
        "topics": [
          "Git branching strategies (GitFlow, trunk-based)",
          "GitHub Actions workflows",
          "Jenkins basics",
          "CI pipeline setup",
          "CD to cloud platforms",
          "Blue-green deployment",
          "Canary deployment",
          "Rolling deployment",
          "Rollback strategies",
          "Infrastructure as Code (Terraform basics)"
        ]
      }
    }
  }
}

// All category names
export const CSE_CATEGORIES = Object.keys(CSE_SYLLABUS)

// Get subjects for a category
export function getSubjectsForCategory(category: string): string[] {
  return Object.keys(CSE_SYLLABUS[category]?.subjects ?? {})
}

// Get topics for a subject in a category
export function getTopicsForSubject(
  category: string,
  subject: string
): string[] {
  return CSE_SYLLABUS[category]?.subjects[subject]?.topics ?? []
}

// Count total topics across all categories
export function countTotalTopics(): number {
  return Object.values(CSE_SYLLABUS).reduce((total, cat) =>
    total + Object.values(cat.subjects).reduce((s, sub) =>
      s + sub.topics.length, 0
    ), 0
  )
}