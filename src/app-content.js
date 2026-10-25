/* ===================== LEARN · HELP · DEVELOPED BY ===================== */

/* Edit this block to finalise the team. A photo can be a file path (e.g. 'team/yusuf.jpg') or a data: URL. */
const TEAM = {
  course: 'BACSE202 Database Systems · Digital Assignment',
  institute: 'VIT Chennai',
  guide: { name: 'Dr. Swaminathan A', title: 'Assistant Professor' },
  members: [
    { name: 'Yusuf Khan', reg: '25BCE5307', photo: '', role: 'Engine, lab and table engine',
      work: ['Parser, attribute closure, candidate-key search', 'Normal-form analysis, dependency diagram and Lab interface', 'Table engine: 1NF repair, dependency and key discovery, SQL'] },
    { name: 'Mohammed Mubashir Hasan', reg: '25BCE5209', photo: '', role: 'Decomposition, quiz and PYQs',
      work: ['Minimal cover, 3NF synthesis, BCNF decomposition', 'Chase test and dependency preservation', 'Tables page, quiz generator and the PYQ bank'] },
    { name: 'E T Suhas Aradhya', reg: '25BCE5560', photo: '', role: 'Learning material, reports and testing',
      work: ['Learn section and animated explainer', 'Help guide and report downloads', 'Testing: engine, table and browser test suites (over 3,200 checks)'] }
  ]
};

const LEARN_SECTIONS = [
  ['problem', 'The problem this lab addresses'], ['anomalies', 'Why normalize'], ['fd', 'Functional dependencies'],
  ['closure', 'Closure and keys'], ['cover', 'Minimal cover'], ['forms', 'Normal forms, 1NF to 5NF'],
  ['decomp', 'Decomposition'], ['tables', 'Normalizing a real table'], ['film', 'Animated explainer'], ['gate', 'Exam shortcuts'], ['refs', 'References']
];

RENDER.learn = function () {
  const root = $('#view-learn'); if (root.dataset.built) return; root.dataset.built = '1';
  root.innerHTML = `<div class="view-head"><div><h1>Learn normalization</h1><p class="muted">The theory behind every tab of the lab, with worked examples and an animated walkthrough.</p></div></div>
  <div class="doc"><nav class="toc" aria-label="Learn contents"><ol>${LEARN_SECTIONS.map(([id, t]) => `<li><a href="#learn" data-sec="${id}">${esc(t)}</a></li>`).join('')}</ol></nav>
  <article class="prose">${LEARN_HTML}</article></div>`;
  $$('.toc a', root).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('sec-' + a.dataset.sec).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }));
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) $$('.toc a', root).forEach((a) => a.classList.toggle('on', 'sec-' + a.dataset.sec === en.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
  $$('.prose section', root).forEach((s) => io.observe(s));
  $$('[data-try]', root).forEach((b) => b.addEventListener('click', () => { const ex = EXAMPLES.find((x) => x.id === b.dataset.try); labLoad(ex.schema, ex.deps, ex.decomp || ''); }));
  initFilm();
};

const LEARN_HTML = `
<section id="sec-problem"><h2>The problem this lab addresses</h2>
<p>Students learn normalization as a sequence of definitions, then meet exam questions that need them applied quickly and exactly: compute a closure, find every candidate key, decide the highest normal form, check a decomposition. Done by hand, one missed step gives a wrong answer with no way to see where it went wrong.</p>
<p>This lab takes any relation and its dependencies and performs each of those procedures with every intermediate step shown, so a student can check their own working line by line. It also accepts an actual table of data: it repairs first normal form, finds the dependencies and keys the rows support, shows the redundancy cell by cell, splits the table stage by stage with the real rows, proves the split by joining the tables back, and writes the SQL. It also generates unlimited practice and collects real previous-year questions.</p>
<h3>Objectives</h3>
<ol><li>Compute the closure of any attribute set and show each dependency that fires.</li><li>Find all candidate keys, prime attributes and the number of superkeys.</li><li>Derive a minimal cover in its three stages.</li><li>Decide the highest normal form from 1NF to 5NF and name the dependency responsible.</li><li>Produce a 3NF synthesis and a BCNF decomposition.</li><li>Test any decomposition for a lossless join (chase) and dependency preservation.</li><li>Draw the dependency diagram with each dependency coloured by its effect.</li><li>Provide self-graded practice with GATE-style marking, and previous-year questions with solutions.</li><li>Export the full analysis as PDF, Word or text.</li><li>Normalize a table of real data from 1NF to 4NF, showing the resulting tables with their rows.</li><li>Discover functional dependencies and candidate keys from data, and check any rule against the rows.</li><li>Verify each decomposition on the data itself by rejoining the tables, and generate SQL (MySQL, PostgreSQL, Oracle, SQLite) with keys and foreign keys.</li></ol>
<h3>Inputs and outputs</h3>
<table class="t"><thead><tr><th>Input</th><th>Form</th></tr></thead><tbody>
<tr><td>Relation schema</td><td><code>Name(a1, a2, …)</code> or <code>ABCD</code>, 2 to 16 attributes</td></tr>
<tr><td>Functional dependencies</td><td><code>X -&gt; Y</code>, one per line</td></tr>
<tr><td>Multivalued dependencies (optional)</td><td><code>X -&gt;&gt; Y</code></td></tr>
<tr><td>Decomposition (optional)</td><td><code>R1(…), R2(…)</code></td></tr>
<tr><td>Table of data (Tables page)</td><td>CSV, TSV, Markdown table or Excel sheet, pasted, uploaded or typed into the grid; up to 2,000 rows and 16 columns</td></tr></tbody></table>
<table class="t"><thead><tr><th>Output</th><th>Where</th></tr></thead><tbody>
<tr><td>Dependency diagram, normal-form ladder, keys, prime attributes, superkey count</td><td>Lab summary</td></tr>
<tr><td>Per-dependency verdicts and partial dependencies</td><td>Normal forms tab</td></tr>
<tr><td>Closure derivation</td><td>Closure tab</td></tr>
<tr><td>Key search and minimality proof</td><td>Keys tab</td></tr>
<tr><td>Minimal and canonical cover</td><td>Minimal cover tab</td></tr>
<tr><td>3NF and BCNF decompositions with their properties</td><td>Decompose tab</td></tr>
<tr><td>Chase tableau, preservation table, per-part normal forms</td><td>Test decomposition tab</td></tr>
<tr><td>1NF table, dependencies and keys found in the data, redundancy map, anomalies</td><td>Tables, steps 2–4</td></tr>
<tr><td>Tables at 2NF, 3NF, BCNF and 4NF with their rows, schema diagram, rejoin check</td><td>Tables, step 5</td></tr>
<tr><td>SQL script, tables as Excel or CSV</td><td>Tables, step 6</td></tr>
<tr><td>Report with inputs, steps, results and the diagram</td><td>Download</td></tr></tbody></table>
<h3>Functional requirements</h3>
<ul><li>Reject malformed input with a message naming the line and the problem, and keep the last valid results visible but dimmed.</li><li>Recompute everything within a fraction of a second as the input changes.</li><li>Refuse relations above 16 attributes, since key search grows as 2<sup>n</sup>.</li><li>Never depend on stored data: progress and preferences are conveniences kept in the browser.</li><li>Work on phones, keyboards and screen readers, in day and night themes.</li></ul>
</section>

<section id="sec-anomalies"><h2>Why normalize</h2>
<p>Consider one table that records course enrolments at VIT:</p>
<div class="scroll-x"><table class="t"><thead><tr><th>regno</th><th>name</th><th>hostel</th><th>course</th><th>title</th><th>credits</th><th>grade</th></tr></thead><tbody>
<tr><td>25BCE1001</td><td>Arjun</td><td>A Block</td><td>BACSE202</td><td>Database Systems</td><td>4</td><td>S</td></tr>
<tr><td>25BCE1001</td><td>Arjun</td><td>A Block</td><td>BACSE106</td><td>Operating Systems</td><td>4</td><td>A</td></tr>
<tr><td>25BCE1002</td><td>Meera</td><td>C Block</td><td>BACSE202</td><td>Database Systems</td><td>4</td><td>A</td></tr></tbody></table></div>
<p>The key is (regno, course), yet name and hostel depend on regno alone, and title and credits on course alone. That causes three anomalies:</p>
<ul><li><b>Update anomaly.</b> Arjun moves to D Block. Every one of his rows must change; miss one and the table contradicts itself.</li>
<li><b>Insertion anomaly.</b> A new course cannot be recorded until someone enrols, because course alone is not a key.</li>
<li><b>Deletion anomaly.</b> If Meera drops her only course, the fact that she lives in C Block disappears with it.</li></ul>
<p>Normalization removes these by splitting the table so that every fact is stored once, in a table whose key determines it. <button class="btn sm" data-try="vit">Open this table in the lab</button></p>
</section>

<section id="sec-fd"><h2>Functional dependencies</h2>
<div class="defn">X → Y holds on R when any two tuples that agree on X also agree on Y. X is the determinant.</div>
<p>A dependency is <i>trivial</i> when Y ⊆ X; it holds in every relation. The set of all dependencies implied by a set F is its closure, F⁺.</p>
<h3>Armstrong’s axioms</h3>
<p>These three rules are sound (they derive only true dependencies) and complete (they derive all of F⁺), as Armstrong proved in 1974.</p>
<ul><li><b>Reflexivity:</b> if Y ⊆ X then X → Y.</li><li><b>Augmentation:</b> if X → Y then XZ → YZ.</li><li><b>Transitivity:</b> if X → Y and Y → Z then X → Z.</li></ul>
<h3>Derived rules</h3>
<ul><li><b>Union:</b> X → Y and X → Z give X → YZ (augmentation and transitivity; GATE 2026 asked exactly this).</li><li><b>Decomposition:</b> X → YZ gives X → Y and X → Z (reflexivity and transitivity).</li><li><b>Pseudotransitivity:</b> X → Y and WY → Z give WX → Z.</li></ul>
<p>Watch for the common trap: from XY → Z you cannot conclude X → Z or Y → Z. The other direction is safe: X → Z always gives XY → Z by augmentation.</p>
</section>

<section id="sec-closure"><h2>Closure and keys</h2>
<h3>Attribute closure</h3>
<p>X⁺ is every attribute determined by X. Start with X; whenever some dependency A → B has A inside the current set, add B; stop when a full pass adds nothing. This runs in time roughly proportional to the size of F times the number of attributes, and it answers almost every question in this topic:</p>
<ul><li>Is X → Y implied? Check whether Y ⊆ X⁺.</li><li>Is X a superkey? Check whether X⁺ is every attribute.</li><li>Are two dependency sets equivalent? Each set’s dependencies must be implied by the other.</li></ul>
<h3>Finding every candidate key</h3>
<p>A candidate key is a minimal superkey. Sort attributes into three groups:</p>
<ol><li>Attributes that appear on no right side can never be derived, so they are in every key.</li><li>Attributes that appear only on right sides are always derived, so they are in no key.</li><li>The rest may or may not be in a key. Add subsets of them to group 1, smallest first, and keep each one whose closure is everything and which contains no key already found.</li></ol>
<p>Example: R(A,B,C,D,E,H) with A → B, BC → D, E → C, D → A (GATE 2005). E and H never appear on the right, so every key contains EH. (EH)⁺ = CEH, so add one more: AEH, BEH and DEH all close to everything. Those are the keys.</p>
<h3>Counting superkeys</h3>
<p>With one key of k attributes in an n-attribute relation, there are 2<sup>n−k</sup> superkeys. With several keys, use inclusion–exclusion: for keys K1 and K2, |S(K1)| + |S(K2)| − |S(K1 ∪ K2)|, where |S(X)| = 2<sup>n−|X|</sup>.</p>
</section>

<section id="sec-cover"><h2>Minimal cover</h2>
<p>A minimal (irreducible) cover is an equivalent set of dependencies with nothing to spare. Build it in three stages, in this order:</p>
<ol><li><b>Split right sides</b> so each has one attribute.</li><li><b>Remove extraneous left-side attributes.</b> In AB → C, B is extraneous if A⁺ already contains C.</li><li><b>Remove redundant dependencies.</b> X → A is redundant if the others imply it.</li></ol>
<p>The order matters: removing extraneous attributes first can expose new redundancies. A relation can have more than one minimal cover. Merging dependencies with the same left side gives the canonical cover used by 3NF synthesis.</p>
</section>

<section id="sec-forms"><h2>Normal forms, 1NF to 5NF</h2>
<table class="t"><thead><tr><th>Form</th><th>Condition</th><th>What breaks it</th></tr></thead><tbody>
<tr><td>1NF</td><td>Every value is atomic</td><td>A set-valued or composite attribute</td></tr>
<tr><td>2NF</td><td>1NF, and no non-prime attribute depends on a proper part of a candidate key</td><td>Partial dependency: regno → hostel when the key is (regno, course)</td></tr>
<tr><td>3NF</td><td>For every non-trivial X → A: X is a superkey or A is prime</td><td>Transitive dependency: emp_id → dept_id → dept_name</td></tr>
<tr><td>BCNF</td><td>For every non-trivial X → A: X is a superkey</td><td>A non-key determinant of a prime attribute: C → B with keys AB and AC</td></tr>
<tr><td>4NF</td><td>BCNF, and for every non-trivial MVD X ↠ Y: X is a superkey</td><td>Independent multivalued facts: course ↠ teacher, course ↠ book</td></tr>
<tr><td>5NF</td><td>Every join dependency is implied by the candidate keys</td><td>A three-way rule that only holds as a join of three projections</td></tr></tbody></table>
<h3>How the lab decides</h3>
<p>For 2NF the lab closes every proper subset of every candidate key and looks for non-prime attributes it determines. For 3NF and BCNF it is enough to test the given dependencies (with right sides split), not all of F⁺. 4NF uses the multivalued dependencies you declare. 5NF needs join dependencies, which dependencies alone cannot express, so the lab only claims 5NF when a theorem guarantees it: a 3NF relation whose candidate keys are all single attributes is in 5NF (Date and Fagin, 1992). Otherwise it says the question cannot be decided from the input.</p>
<div class="callout info">A relation in 3NF but not BCNF always has at least two candidate keys that overlap and are composite. With a single candidate key, 3NF and BCNF coincide.</div>
<p><button class="btn sm" data-try="3nf">See a 3NF-but-not-BCNF relation</button> <button class="btn sm" data-try="mvd">See a 4NF violation</button></p>
</section>

<section id="sec-decomp"><h2>Decomposition</h2>
<h3>Lossless join</h3>
<p>Splitting R into R1 and R2 is lossless when joining them back gives exactly R, with no spurious tuples. For two parts the test is simple: the shared attributes R1 ∩ R2 must be a superkey of R1 or of R2. For more parts, use the chase: build a tableau with one row per part, write a<sub>j</sub> where the part has attribute j and b<sub>ij</sub> elsewhere, and repeatedly equate values in rows that agree on a dependency’s left side. The join is lossless exactly when some row becomes all a’s (Aho, Beeri and Ullman, 1979).</p>
<h3>Dependency preservation</h3>
<p>A decomposition preserves dependencies when every dependency in F can be checked inside the parts, possibly by combining them. To test X → Y without computing F⁺, start Z = X and repeat Z = Z ∪ ((Z ∩ Ri)⁺ ∩ Ri) over all parts until Z stops growing; X → Y is preserved when Y ⊆ Z.</p>
<h3>The two algorithms</h3>
<table class="t"><thead><tr><th></th><th>3NF synthesis</th><th>BCNF decomposition</th></tr></thead><tbody>
<tr><td>Method</td><td>One relation per canonical-cover left side, plus a key relation if none contains a key</td><td>Split on any violation X → Y into X⁺ and R − (X⁺ − X), repeat</td></tr>
<tr><td>Lossless</td><td>Always</td><td>Always</td></tr>
<tr><td>Dependency preserving</td><td>Always</td><td>Not always</td></tr>
<tr><td>Redundancy from FDs</td><td>Can remain</td><td>None</td></tr></tbody></table>
<p>The standard counter-example is R(A,B,C) with AB → C and C → B: any BCNF split separates C from A and loses AB → C. That is why designers often settle for 3NF.</p>
</section>

<section id="sec-tables"><h2>Normalizing a real table</h2>
<p>Everything above works on a <i>schema</i>: attribute names and dependencies. In practice you usually start from an <i>instance</i>: a spreadsheet of rows. The Tables page follows the same theory, with one important difference in what the data can tell you.</p>
<div class="defn">An instance can prove that a dependency is false, but it can never prove that a dependency is true. One pair of rows that agree on X and differ on Y refutes X → Y; any number of agreeing rows only fails to refute it (GATE 2002, Q2.25).</div>
<h3>Step 1 and 2: getting to first normal form</h3>
<ul><li><b>Several values in a cell</b> (“Robotics; Music”) break atomicity. Each value gets its own row.</li>
<li><b>Repeating groups</b> (course1, grade1, course2, grade2) hide one fact in numbered columns. They fold into one pair of columns with a row per filled index.</li>
<li><b>Duplicate rows</b> are dropped, because a relation is a set.</li>
<li><b>Empty cells</b> become NULL, and a column holding NULL cannot be part of a primary key.</li></ul>
<p>When two independent lists sit in one row, flattening pairs every value of one with every value of the other. That creates a multivalued dependency, which 4NF later removes.</p>
<h3>Step 3: dependencies and keys from the data</h3>
<p>A column set is a candidate key <i>of the instance</i> when no two rows share its values and no smaller subset has that property. A dependency X → A is reported when every row obeys it, no smaller X does, and some X value actually repeats, so the data really tested the rule. This is the same search that dependency-discovery algorithms such as TANE perform, restricted to small left sides.</p>
<p>Small samples produce coincidences: if every student in the sample has a different name, then name → regno holds in the data. The page marks columns that mirror each other one-to-one, prefers rules whose left side is an identifier, and asks you to confirm. You can also add rules you know are true; each one is checked against the rows, and a violated rule is reported with the two rows that break it.</p>
<h3>Step 4: measuring the problem</h3>
<p>For every dependency whose left side is not a key, each repeat of a left-side value restates the same right-side value. Those cells are redundant: they could be deleted and recomputed. The page highlights them, counts them, and phrases the update, insertion and deletion anomalies with your own rows.</p>
<h3>Step 5: decomposition, stage by stage</h3>
<table class="t"><thead><tr><th>Stage</th><th>What is split</th></tr></thead><tbody>
<tr><td>2NF</td><td>Attributes that depend on part of a key move to a table keyed by that part.</td></tr>
<tr><td>3NF</td><td>Any table still holding a transitive dependency is re-synthesised from its own dependencies (Bernstein).</td></tr>
<tr><td>BCNF</td><td>Any table with a non-key determinant is split on it.</td></tr>
<tr><td>4NF</td><td>Independent multivalued facts are separated.</td></tr></tbody></table>
<p>Each table is the projection of the 1NF table onto its columns, with duplicate rows removed. Two checks run on every stage. The chase proves losslessness from the dependencies. The <b>rejoin check</b> joins the actual tables back together and compares the result with the original rows: a lossless split gives back exactly the same rows, while a lossy one invents spurious rows. If a ticked rule is false for the data, the split table shows a repeated key, which is how the data tells you the rule was wrong.</p>
<h3>Step 6: from design to SQL</h3>
<p>Column types are inferred from the values (whole numbers, decimals, ISO dates, text with a length that fits). Each table gets its primary key, a UNIQUE constraint for every other candidate key, and a FOREIGN KEY wherever it contains another table’s primary key. Tables are created in dependency order so every reference already exists, followed by INSERT statements for the data. Identifiers that clash with reserved words are quoted for the chosen database.</p>
<p><button class="btn sm" onclick="location.hash='#tables'">Open the Tables page</button></p>
</section>

<section id="sec-film"><h2>Animated explainer</h2>
<p>A narrated walkthrough of normalizing the enrolment table above, from anomalies to a BCNF design, in about a minute.</p>
<div class="film" id="film"><div class="film-stage" id="film-stage"></div><div class="film-cap" id="film-cap" aria-live="polite"></div>
<div class="film-ctl"><button id="film-play" aria-label="Play">Play</button><button id="film-restart" aria-label="Restart">Restart</button><input type="range" id="film-seek" min="0" max="1000" value="0" aria-label="Seek"><span id="film-time">0:00 / 0:00</span></div></div>
<p class="small">Recorded lectures: <a href="https://www.youtube.com/results?search_query=Decomplexify+database+normalization" target="_blank" rel="noopener">Decomplexify’s normalization explainer on YouTube</a> and the <a href="https://nptel.ac.in/" target="_blank" rel="noopener">NPTEL Database Management System course</a>.</p>
</section>

<section id="sec-gate"><h2>Exam shortcuts</h2>
<ul><li>Any attribute absent from every right side is in every candidate key. Check options against this first; it often eliminates three of four.</li>
<li>Every relation with two attributes is in BCNF. GATE has used this at least four times.</li>
<li>If every attribute is prime, the relation is in 3NF, but not necessarily BCNF.</li>
<li>If every candidate key is a single attribute and the relation is in 3NF, it is in BCNF, and in fact 5NF.</li>
<li>3NF but not BCNF needs two overlapping composite candidate keys.</li>
<li>BCNF decomposition is always lossless, never guaranteed to preserve dependencies. 3NF synthesis guarantees both.</li>
<li>For a two-part split, check whether the common attributes form a key of either part. For three or more, run the chase.</li>
<li>In GATE, wrong answers to single-answer MCQs cost a third of their marks; multiple-select and numerical questions carry no negative marks.</li></ul>
</section>

<section id="sec-refs"><h2>References</h2>
<h3>Books</h3><ol class="refs">
<li>A. Silberschatz, H. F. Korth and S. Sudarshan, <i>Database System Concepts</i>, 7th ed. McGraw-Hill, 2019. Chapter 7, Relational Database Design.</li>
<li>R. Elmasri and S. B. Navathe, <i>Fundamentals of Database Systems</i>, 7th ed. Pearson, 2016. Chapters 14 and 15.</li>
<li>R. Ramakrishnan and J. Gehrke, <i>Database Management Systems</i>, 3rd ed. McGraw-Hill, 2003. Chapter 19.</li>
<li>C. J. Date, <i>An Introduction to Database Systems</i>, 8th ed. Addison-Wesley, 2004.</li>
<li>J. D. Ullman and J. Widom, <i>A First Course in Database Systems</i>, 3rd ed. Pearson, 2008.</li>
<li>S. Abiteboul, R. Hull and V. Vianu, <i>Foundations of Databases</i>. Addison-Wesley, 1995.</li></ol>
<h3>Papers</h3><ol class="refs">
<li>E. F. Codd, “A Relational Model of Data for Large Shared Data Banks,” <i>Communications of the ACM</i>, 13(6), 377–387, 1970.</li>
<li>E. F. Codd, “Further Normalization of the Data Base Relational Model,” in R. Rustin (ed.), <i>Data Base Systems</i>, Prentice-Hall, 1972. Introduces 2NF and 3NF.</li>
<li>E. F. Codd, “Recent Investigations in Relational Data Base Systems,” <i>Proc. IFIP Congress</i>, 1974. Introduces Boyce–Codd normal form.</li>
<li>W. W. Armstrong, “Dependency Structures of Data Base Relationships,” <i>Proc. IFIP Congress</i>, 580–583, 1974.</li>
<li>P. A. Bernstein, “Synthesizing Third Normal Form Relations from Functional Dependencies,” <i>ACM TODS</i>, 1(4), 277–298, 1976.</li>
<li>R. Fagin, “Multivalued Dependencies and a New Normal Form for Relational Databases,” <i>ACM TODS</i>, 2(3), 262–278, 1977.</li>
<li>C. L. Lucchesi and S. L. Osborn, “Candidate Keys for Relations,” <i>Journal of Computer and System Sciences</i>, 17(2), 270–279, 1978.</li>
<li>C. Beeri and P. A. Bernstein, “Computational Problems Related to the Design of Normal Form Relational Schemas,” <i>ACM TODS</i>, 4(1), 30–59, 1979.</li>
<li>A. V. Aho, C. Beeri and J. D. Ullman, “The Theory of Joins in Relational Databases,” <i>ACM TODS</i>, 4(3), 297–314, 1979. The chase.</li>
<li>R. Fagin, “Normal Forms and Relational Database Operators,” <i>Proc. ACM SIGMOD</i>, 153–160, 1979. Project–join normal form (5NF).</li>
<li>C. J. Date and R. Fagin, “Simple Conditions for Guaranteeing Higher Normal Forms in Relational Databases,” <i>ACM TODS</i>, 17(3), 465–476, 1992.</li>
<li>H. Mannila and K.-J. Räihä, “Dependency Inference,” <i>Proc. VLDB</i>, 155–158, 1987.</li>
<li>Y. Huhtala, J. Kärkkäinen, P. Porkka and H. Toivonen, “TANE: An Efficient Algorithm for Discovering Functional and Approximate Dependencies,” <i>The Computer Journal</i>, 42(2), 100–111, 1999.</li>
<li>T. Papenbrock et al., “Functional Dependency Discovery: An Experimental Evaluation of Seven Algorithms,” <i>Proc. VLDB Endowment</i>, 8(10), 1082–1093, 2015.</li></ol>
<h3>Websites and videos</h3><ol class="refs">
<li>GATE Overflow, questions tagged database-normalization: <a href="https://gateoverflow.in/tag/database-normalization" target="_blank" rel="noopener">gateoverflow.in/tag/database-normalization</a>. Source of the PYQ texts and answer discussions.</li>
<li>Wikipedia, “Database normalization”: <a href="https://en.wikipedia.org/wiki/Database_normalization" target="_blank" rel="noopener">en.wikipedia.org/wiki/Database_normalization</a>.</li>
<li>NPTEL, Database Management System lectures: <a href="https://nptel.ac.in/" target="_blank" rel="noopener">nptel.ac.in</a>.</li>
<li>Decomplexify, database normalization explainer: <a href="https://www.youtube.com/results?search_query=Decomplexify+database+normalization" target="_blank" rel="noopener">YouTube</a>.</li></ol>
<h3>Tools</h3><ol class="refs"><li>Plain JavaScript, HTML and CSS; jsPDF for PDF export, SheetJS for reading uploaded Excel files; Excel, Word and CSV-bundle files are written by the app’s own code (src/files.js); fonts from Google Fonts (Literata, Atkinson Hyperlegible, IBM Plex Mono).</li></ol>
</section>`;

/* ---------- animated explainer: scenes drawn to SVG from a timeline ---------- */
const FILM = { t: 0, playing: false, last: 0, raf: 0 };
const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const COLS = ['regno', 'name', 'hostel', 'course', 'title', 'credits', 'grade'];
const ROWS = [['25BCE1001', 'Arjun', 'A Block', 'BACSE202', 'Database Sys.', '4', 'S'], ['25BCE1001', 'Arjun', 'A Block', 'BACSE106', 'Operating Sys.', '4', 'A'], ['25BCE1002', 'Meera', 'C Block', 'BACSE202', 'Database Sys.', '4', 'A']];
const CW = [86, 60, 64, 78, 104, 54, 50];
const CX = CW.reduce((a, w, i) => (a.push(i ? a[i - 1] + CW[i - 1] : 22), a), []);
const C = { bg: '#0f1a2e', line: '#2a3b5c', txt: '#e8eef8', dim: '#8ea0bf', acc: '#82a3ff', warn: '#f0ab50', ok: '#52c58f', bad: '#ff8073', prime: '#b9a2ff' };
function tableSVG(x0, y0, cols, rows, opt = {}) {
  let s = ''; const w = cols.reduce((a, c) => a + c.w, 0); const rh = 24;
  s += `<rect x="${x0}" y="${y0}" width="${w}" height="${rh * (rows.length + 1)}" rx="4" fill="#132240" stroke="${opt.stroke || C.line}" opacity="${opt.op ?? 1}"/>`;
  let x = x0;
  cols.forEach((c) => {
    s += `<text x="${x + 6}" y="${y0 + 16}" font-size="11" font-weight="700" fill="${c.color || C.acc}" opacity="${opt.op ?? 1}" ${c.key ? 'text-decoration="underline"' : ''}>${c.n}</text>`;
    rows.forEach((r, ri) => { const v = r[c.i]; const hl = opt.hl && opt.hl(c.i, ri); s += `${hl ? `<rect x="${x + 2}" y="${y0 + rh * (ri + 1) + 3}" width="${c.w - 4}" height="${rh - 6}" rx="3" fill="${hl}" opacity="${0.35 * (opt.op ?? 1)}"/>` : ''}<text x="${x + 6}" y="${y0 + rh * (ri + 1) + 16}" font-size="10.5" fill="${C.txt}" opacity="${(opt.rowOp ? opt.rowOp(ri) : 1) * (opt.op ?? 1)}">${v}</text>`; });
    x += c.w;
  });
  return s;
}
const fullCols = () => COLS.map((n, i) => ({ n, i, w: CW[i] }));
const SCENES = [
  { d: 6, cap: 'One table records every enrolment: who the student is, where they live, what the course is, and the grade.',
    draw: (p) => `<text x="22" y="40" font-size="20" font-family="Literata, Georgia, serif" fill="${C.txt}" opacity="${ease(p * 3)}">Enrolment</text>` + tableSVG(22, 70, fullCols(), ROWS, { rowOp: (r) => ease(p * 3 - 0.4 - r * 0.5) }) },
  { d: 7, cap: 'The same facts repeat. Arjun’s hostel is stored twice, and “Database Systems” is stored once per student. Change one copy and the table contradicts itself.',
    draw: (p) => { const pulse = 0.5 + 0.5 * Math.sin(p * Math.PI * 6); return tableSVG(22, 70, fullCols(), ROWS, { hl: (c, r) => ((c === 1 || c === 2) && r < 2 ? C.warn : (c === 4 || c === 5) && r !== 1 ? C.bad : null) }) + `<text x="22" y="200" font-size="13" fill="${C.warn}" opacity="${0.6 + 0.4 * pulse}">Update anomaly</text><text x="150" y="200" font-size="13" fill="${C.dim}" opacity="${ease(p * 2 - 0.6)}">Insertion and deletion anomalies follow from the same cause.</text>`; } },
  { d: 7, cap: 'Write down what determines what: regno → name, hostel; course → title, credits; and the pair regno, course → grade.',
    draw: (p) => schemaRow(p, [[0, [1, 2], C.acc], [3, [4, 5], C.acc], [[0, 3], [6], C.acc]]) },
  { d: 6, cap: 'Close {regno, course}: it reaches every attribute, and neither half does alone. So (regno, course) is the only candidate key.',
    draw: (p) => schemaRow(1, [[0, [1, 2], C.acc], [3, [4, 5], C.acc], [[0, 3], [6], C.acc]], { sweep: ease(p * 1.4), key: true }) },
  { d: 7, cap: 'regno alone determines name and hostel, and course alone determines title and credits. Part of the key determines non-key attributes: partial dependencies. The table is only in 1NF.',
    draw: (p) => schemaRow(1, [[0, [1, 2], C.warn], [3, [4, 5], C.warn], [[0, 3], [6], C.ok]], { key: true, label: ease(p * 2) }) },
  { d: 8, cap: 'Split on each partial dependency. Student(regno, name, hostel), Course(course, title, credits), and Enrolment(regno, course, grade) keep each fact exactly once.',
    draw: (p) => splitScene(ease(p * 1.3)) },
  { d: 6, cap: 'Check the split. The chase finds a row of all distinguished symbols, so the join is lossless, and each dependency lives inside one table, so all are preserved.',
    draw: (p) => splitScene(1) + `<g opacity="${ease(p * 2)}"><rect x="22" y="282" width="596" height="40" rx="6" fill="#12301f"/><text x="38" y="307" font-size="13" fill="${C.ok}">Lossless join  ·  dependency preserving  ·  every table in BCNF</text></g>` },
  { d: 6, cap: 'Every determinant is now a key. That is Boyce–Codd normal form. Try your own relation in the lab.',
    draw: (p) => `<text x="320" y="160" text-anchor="middle" font-size="26" font-family="Literata, Georgia, serif" fill="${C.txt}" opacity="${ease(p * 2)}">Every determinant is a key.</text><text x="320" y="196" text-anchor="middle" font-size="14" fill="${C.dim}" opacity="${ease(p * 2 - 0.5)}">That is BCNF.</text>` }
];
function schemaRow(p, deps, opt = {}) {
  const y = 90; let s = `<text x="22" y="50" font-size="16" font-family="Literata, Georgia, serif" fill="${C.txt}">Enrolment(${COLS.join(', ')})</text>`;
  const cx = (i) => CX[i] + CW[i] / 2;
  COLS.forEach((n, i) => {
    const swept = opt.sweep != null && opt.sweep * 7 > i;
    const isKey = opt.key && (i === 0 || i === 3);
    s += `<rect x="${CX[i]}" y="${y}" width="${CW[i] - 6}" height="30" rx="4" fill="${swept ? '#1d3a2c' : isKey ? '#261d42' : '#132240'}" stroke="${isKey ? C.prime : C.line}"/><text x="${CX[i] + 6}" y="${y + 19}" font-size="11" fill="${C.txt}" ${isKey ? 'text-decoration="underline"' : ''}>${n}</text>`;
  });
  deps.forEach(([l, r, col], k) => {
    const L = [].concat(l); const yy = y + 52 + k * 26; const prog = ease(p * 3 - k * 0.6);
    const xs = L.concat(r).map(cx); const x1 = Math.min(...xs), x2 = Math.max(...xs);
    s += `<g opacity="${prog}"><line x1="${x1}" x2="${x1 + (x2 - x1) * prog}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="2"/>`;
    L.forEach((i) => (s += `<line x1="${cx(i) - 6}" x2="${cx(i) - 6}" y1="${y + 30}" y2="${yy}" stroke="${col}" stroke-width="2"/><circle cx="${cx(i) - 6}" cy="${y + 33}" r="3" fill="${col}"/>`));
    r.forEach((i) => (s += `<line x1="${cx(i) - 6}" x2="${cx(i) - 6}" y1="${yy}" y2="${y + 36}" stroke="${col}" stroke-width="2"/><path d="M${cx(i) - 11} ${y + 40} L${cx(i) - 6} ${y + 32} L${cx(i) - 1} ${y + 40} Z" fill="${col}"/>`));
    if (opt.label != null && col !== C.acc) s += `<text x="${x2 + 10}" y="${yy + 4}" font-size="11" fill="${col}" opacity="${opt.label}">${col === C.warn ? 'partial' : 'full key'}</text>`;
    s += '</g>';
  });
  return s;
}
function splitScene(p) {
  const t1 = [{ n: 'regno', i: 0, w: 86, key: 1 }, { n: 'name', i: 1, w: 60 }, { n: 'hostel', i: 2, w: 64 }];
  const t2 = [{ n: 'course', i: 3, w: 78, key: 1 }, { n: 'title', i: 4, w: 104 }, { n: 'credits', i: 5, w: 54 }];
  const t3 = [{ n: 'regno', i: 0, w: 86, key: 1 }, { n: 'course', i: 3, w: 78, key: 1 }, { n: 'grade', i: 6, w: 50 }];
  const s1 = [ROWS[0], ROWS[2]], s2 = [ROWS[0], ROWS[1]], s3 = ROWS;
  const lerp = (a, b) => a + (b - a) * p;
  return `<text x="22" y="40" font-size="14" fill="${C.dim}">Decompose on the partial dependencies</text>`
    + `<text x="${lerp(22, 22)}" y="${lerp(70, 64)}" font-size="12" fill="${C.txt}">Student</text>` + tableSVG(lerp(22, 22), lerp(80, 72), t1, s1, { op: 0.3 + 0.7 * p })
    + `<text x="${lerp(22, 270)}" y="${lerp(70, 64)}" font-size="12" fill="${C.txt}">Course</text>` + tableSVG(lerp(22, 270), lerp(80, 72), t2, s2, { op: 0.3 + 0.7 * p })
    + `<text x="${lerp(22, 22)}" y="${lerp(70, 166)}" font-size="12" fill="${C.txt}">Enrolment</text>` + tableSVG(lerp(22, 22), lerp(80, 174), t3, s3, { op: 0.3 + 0.7 * p });
}
const FILM_LEN = SCENES.reduce((a, s) => a + s.d, 0);
function filmFrame() {
  let t = FILM.t, k = 0; while (k < SCENES.length - 1 && t >= SCENES[k].d) { t -= SCENES[k].d; k++; }
  const sc = SCENES[k]; const p = Math.min(1, t / sc.d);
  $('#film-stage').innerHTML = `<svg viewBox="0 0 640 360" role="img" aria-label="Scene ${k + 1} of ${SCENES.length}" font-family="IBM Plex Mono, ui-monospace, monospace"><rect width="640" height="360" fill="${C.bg}"/>${sc.draw(p)}<text x="618" y="346" text-anchor="end" font-size="10" fill="${C.dim}">${k + 1} / ${SCENES.length}</text></svg>`;
  if ($('#film-cap').dataset.k !== String(k)) { $('#film-cap').textContent = sc.cap; $('#film-cap').dataset.k = String(k); }
  $('#film-seek').value = Math.round(FILM.t / FILM_LEN * 1000);
  const f = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  $('#film-time').textContent = `${f(FILM.t)} / ${f(FILM_LEN)}`;
}
function filmLoop(ts) {
  if (!FILM.playing) return;
  if (FILM.last) FILM.t += (ts - FILM.last) / 1000; FILM.last = ts;
  if (FILM.t >= FILM_LEN) { FILM.t = FILM_LEN - 0.001; filmSet(false); }
  filmFrame(); FILM.raf = requestAnimationFrame(filmLoop);
}
function filmSet(play) {
  FILM.playing = play; FILM.last = 0; const b = $('#film-play'); b.textContent = play ? 'Pause' : 'Play'; b.setAttribute('aria-label', play ? 'Pause' : 'Play');
  if (play) { if (FILM.t >= FILM_LEN - 0.01) FILM.t = 0; FILM.raf = requestAnimationFrame(filmLoop); } else cancelAnimationFrame(FILM.raf);
}
function initFilm() {
  FILM.t = 4.5; filmFrame(); // poster: first scene fully drawn
  $('#film-play').addEventListener('click', () => filmSet(!FILM.playing));
  $('#film-restart').addEventListener('click', () => { FILM.t = 0; filmFrame(); filmSet(true); });
  $('#film-seek').addEventListener('input', (e) => { FILM.t = Number(e.target.value) / 1000 * FILM_LEN; filmFrame(); });
}

/* ---------- help ---------- */
RENDER.help = function () {
  const root = $('#view-help'); if (root.dataset.built) return; root.dataset.built = '1';
  root.innerHTML = `<div class="view-head"><div><h1>Help</h1><p class="muted">What each part of the lab does and how to read its output.</p></div></div>
  <div class="prose" style="font-family:var(--f-ui);font-size:.98rem;max-width:80ch">
  <section><h2>What this lab does</h2><p>It analyses a relation schema and its functional (and multivalued) dependencies: closures, candidate keys, minimal cover, highest normal form, 3NF and BCNF decompositions, and lossless-join and dependency-preservation tests for any decomposition you propose. Every result shows the steps that produced it.</p></section>
  <section><h2>Quick start</h2><ol>
    <li>Open <b>Lab</b>. An example relation is already loaded.</li>
    <li>Edit the <b>Relation</b> field, for example <code>R(A, B, C, D)</code>.</li>
    <li>Type one dependency per line in <b>Dependencies</b>, for example <code>A, B -&gt; C</code>.</li>
    <li>Read the summary: the dependency diagram, the normal-form ladder and the facts row.</li>
    <li>Open the tabs for the working: Normal forms, Closure, Keys, Minimal cover, Decompose.</li>
    <li>To check a decomposition, type it in <b>Decomposition to test</b> or press <b>Test this split</b> in the Decompose tab, then step through the chase.</li>
    <li>Practise in <b>Quiz</b> or <b>PYQs</b>; use <b>Solve in the lab</b> on any question to see the full working.</li>
    <li>Export the current analysis from <b>Download</b>.</li></ol></section>
  <section><h2>Normalizing a table of data</h2><ol>
    <li>Open <b>Tables</b>. An example table is loaded; pick another from <b>Load an example</b>, upload a CSV, TSV, Markdown or Excel file, paste rows in <b>Text</b> view, or type into the <b>Grid</b>.</li>
    <li><b>First normal form</b> lists what was fixed: cells with several values, numbered repeating columns, duplicate rows, NULLs. Untick a fix to undo it, or change a list’s separator.</li>
    <li><b>Dependencies</b> shows the keys and rules the rows support. Choose the primary key, tick only rules that are true in general, add your own, and test any rule with <b>Check a rule against the data</b>.</li>
    <li><b>Diagnose</b> shows the diagram, the normal form, the redundant cells in colour and the anomalies in your own rows.</li>
    <li><b>Normalize</b> shows the tables at each stage with their rows, the schema diagram and the three checks. Click a table name to rename it.</li>
    <li><b>SQL and export</b> writes the script for MySQL, PostgreSQL, Oracle or SQLite, and saves the tables as Excel or CSV.</li></ol></section>
  <section><h2>Input syntax</h2><table class="t"><thead><tr><th>You type</th><th>Meaning</th></tr></thead><tbody>
    <tr><td><code>Enrolment(regno, course, grade)</code></td><td>Relation named Enrolment with three attributes</td></tr>
    <tr><td><code>ABCDE</code> or <code>R(A,B,C,D,E)</code></td><td>Single-letter attributes</td></tr>
    <tr><td><code>A, B -&gt; C</code> or <code>AB -&gt; C</code> or <code>AB → C</code></td><td>Functional dependency (letters may be run together when every attribute is one letter)</td></tr>
    <tr><td><code>A -&gt; B, C</code></td><td>Several attributes on the right</td></tr>
    <tr><td><code>A -&gt;&gt; B</code></td><td>Multivalued dependency</td></tr>
    <tr><td><code>A -&gt; B; B -&gt; C</code></td><td>Several dependencies on one line</td></tr>
    <tr><td><code># comment</code></td><td>Ignored</td></tr>
    <tr><td><code>R1(A,B), R2(B,C)</code> or one relation per line</td><td>Decomposition</td></tr></tbody></table></section>
  <section><h2>Every control</h2><table class="t"><thead><tr><th>Control</th><th>What it does</th></tr></thead><tbody>
    <tr><td>Learn (top right)</td><td>Theory, worked examples, the animated explainer and references</td></tr>
    <tr><td>Day / Night</td><td>Switches the colour theme; your choice is remembered in this browser</td></tr>
    <tr><td>Load an example</td><td>Fills the inputs with a prepared relation</td></tr>
    <tr><td>Attribute buttons (Closure tab)</td><td>Toggle attributes in X; the derivation of X⁺ updates at once</td></tr>
    <tr><td>Test this split</td><td>Copies a computed decomposition into the test field and opens the chase</td></tr>
    <tr><td>Previous step / Next step</td><td>Walk the chase tableau one dependency at a time</td></tr>
    <tr><td>Quiz: topics, difficulty, questions, mode</td><td>Shape a generated quiz; Timed test uses GATE marking</td></tr>
    <tr><td>Question palette</td><td>Jump between questions; dashed means marked for review</td></tr>
    <tr><td>PYQ filters and search (press /)</td><td>Narrow by exam, type, status, topic or text</td></tr>
    <tr><td>Attempt the filtered set as a timed paper</td><td>Turns the current PYQ list into a timed test</td></tr>
    <tr><td>Bookmark</td><td>Saves a PYQ to the Bookmarked filter</td></tr>
    <tr><td>Tables: step buttons, Back, Next</td><td>Move through the six steps; a step shows its current result under its name</td></tr>
    <tr><td>Tables: Grid / Text</td><td>Edit cells directly, or paste rows as text</td></tr>
    <tr><td>Tables: Open the schema in the Lab</td><td>Sends the table’s columns and chosen rules to the Lab for the full step-by-step working</td></tr>
    <tr><td>Tables: stage tabs (1NF … 4NF)</td><td>Show the design at each normal form</td></tr>
    <tr><td>Tables: Copy SQL, Download .sql, Excel, CSV</td><td>Take the design out of the lab</td></tr>
    <tr><td>Load this table on the Tables page</td><td>On table-based questions, opens the question’s rows for analysis</td></tr>
    <tr><td>Download: Relation in the Lab / Table in Tables</td><td>Chooses what the report describes</td></tr>
    <tr><td>Download: PDF, Word, Text</td><td>Saves the full report</td></tr></tbody></table></section>
  <section><h2>Reading the output</h2><ul>
    <li><b>Dependency diagram.</b> Each attribute is a box; each dependency is a bar under the boxes, dots at its left side and arrows to its right side. Tinted boxes are prime attributes; underlined names form the first candidate key.</li>
    <li><b>Colours.</b> Blue: left side is a superkey. Violet: prime right side (fine for 3NF, breaks BCNF). Amber: partial dependency (breaks 2NF). Red: transitive dependency (breaks 3NF). Dashed grey: multivalued dependency.</li>
    <li><b>Ladder.</b> Green rungs hold; the outlined one is the highest form; the red rung names the dependency that fails it.</li>
    <li><b>Chase tableau.</b> a<sub>j</sub> (green) are distinguished symbols, b<sub>ij</sub> (grey) are not. Cells changed by the current step are highlighted; a fully green row means lossless.</li></ul></section>
  <section><h2>Troubleshooting</h2><ul>
    <li><b>“… is not in the relation.”</b> A dependency uses an attribute missing from the schema, often a typo or a case difference (names are case-sensitive).</li>
    <li><b>Results look faded.</b> The input currently has an error; the faded results are from the last valid input. Fix the message shown under the inputs.</li>
    <li><b>More than 16 attributes.</b> Key search examines up to 2<sup>n</sup> subsets, so the lab stops at 16. Split the problem.</li>
    <li><b>5NF shows as undecided.</b> 5NF depends on join dependencies, which cannot be written as FDs or MVDs. The lab only claims 5NF when a theorem guarantees it.</li>
    <li><b>Download did nothing.</b> Inside some embedded viewers you are asked to confirm the save first; check for a prompt.</li>
    <li><b>A strange rule was found in my table</b>, such as name → regno. With few rows, coincidences hold. Untick it in step 3; only tick what holds for all possible data.</li>
    <li><b>“The key repeats” in step 5.</b> A ticked rule is false for these rows. Step 3 shows which rule is violated and by which two rows.</li>
    <li><b>The .sql file saved as .sql.txt.</b> Inside the Claude viewer only some file types can be saved; rename it, or use Copy SQL. On a normal website it saves as .sql.</li>
    <li><b>Progress disappeared.</b> Quiz history and PYQ progress live only in this browser; private windows and cleared site data remove them.</li></ul></section>
  <section><h2>Keyboard</h2><ul><li>Tab moves through controls; a skip link jumps to the main content.</li><li>Arrow keys, Home and End move between the analysis tabs.</li><li>/ focuses the PYQ search box.</li></ul></section>
  </div>`;
};

/* ---------- developed by ---------- */
RENDER.team = function () {
  const root = $('#view-team');
  const photos = store.get('team.photos', {});
  const initials = (n) => { const w = (n || '?').split(/\s+/).filter(Boolean); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
  const cards = TEAM.members.map((m, i) => {
    const src = m.photo || photos[i];
    if (!m.name) return `<div class="member pending"><div class="photo" aria-hidden="true">3</div><h3>Third member</h3><p class="muted small">Name, registration number and photograph to be added in the <code>TEAM</code> block at the top of the learning-content script.</p><ul>${m.work.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
    return `<div class="member"><div class="photo">${src ? `<img src="${esc(src)}" alt="Photograph of ${esc(m.name)}">` : `<span aria-hidden="true">${initials(m.name)}</span>`}</div>
      <div><h3>${esc(m.name)}</h3><p class="mono small muted">${esc(m.reg)}</p></div><p><span class="chip acc">${esc(m.role)}</span></p><ul>${m.work.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      ${m.photo ? '' : `<label class="btn sm" style="align-self:flex-start">${src ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" data-photo="${i}" class="sr"></label>`}</div>`;
  }).join('');
  root.innerHTML = `<div class="view-head"><div><h1>Developed by</h1><p class="muted">${esc(TEAM.course)}, ${esc(TEAM.institute)}.</p></div></div>
  <div class="team">${cards}</div>
  <div class="panel pad guide"><div class="photo" style="width:64px;height:64px;font-size:1.3rem" aria-hidden="true">${initials(TEAM.guide.name.replace(/^Dr\.?\s*/, ''))}</div><div><span class="small muted">Guided by</span><h3>${esc(TEAM.guide.name)}</h3><p class="muted">${esc(TEAM.guide.title)}, ${esc(TEAM.institute)}</p></div></div>
  <h2 style="margin:26px 0 10px">Work split by module</h2>
  <div class="panel scroll-x"><table class="t"><thead><tr><th>Module</th><th>Files</th><th>Owner</th></tr></thead><tbody>
    <tr><td>Parsing, closure, keys, normal forms</td><td><code>engine.js</code> (first half)</td><td>${esc(TEAM.members[0].name)}</td></tr>
    <tr><td>Lab interface and dependency diagram</td><td><code>app-lab.js</code>, <code>styles.css</code></td><td>${esc(TEAM.members[0].name)}</td></tr>
    <tr><td>Covers, 3NF synthesis, BCNF, chase, preservation</td><td><code>engine.js</code> (second half)</td><td>${esc(TEAM.members[1].name)}</td></tr>
    <tr><td>Quiz generator and PYQ bank</td><td><code>app-quiz.js</code>, <code>app-pyq.js</code>, <code>pyq.js</code></td><td>${esc(TEAM.members[1].name)}</td></tr>
    <tr><td>Table engine: 1NF repair, dependency and key discovery, rejoin check, SQL</td><td><code>table-engine.js</code></td><td>${esc(TEAM.members[0].name)}</td></tr>
    <tr><td>Tables page and table examples</td><td><code>app-table.js</code>, <code>table-examples.js</code></td><td>${esc(TEAM.members[1].name)}</td></tr>
    <tr><td>Learn, Help, explainer and reports</td><td><code>app-content.js</code>, <code>app-report.js</code></td><td>${esc(TEAM.members[2].name || 'Third member')}</td></tr>
    <tr><td>Testing: engine checks, table checks, end-to-end browser tests</td><td><code>test/run.js</code>, <code>test/tables.js</code>, <code>test/browser.py</code></td><td>${esc(TEAM.members[2].name || 'Third member')}</td></tr></tbody></table></div>
  <p class="hint">Photos added with the buttons above are stored only in this browser. For the submitted version, set each member’s <code>photo</code> field so it ships with the file.</p>`;
  $$('[data-photo]', root).forEach((inp) => inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = 240; c.width = c.height = s; const g = c.getContext('2d'); const m = Math.min(img.width, img.height); g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s); photos[inp.dataset.photo] = c.toDataURL('image/jpeg', 0.85); store.set('team.photos', photos); RENDER.team(); }; img.src = r.result; };
    r.readAsDataURL(f);
  }));
};
